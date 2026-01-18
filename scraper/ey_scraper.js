/**
 * EY Career Page Scraper
 * Scrapes job listings from EY's career page
 */

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

class EYScraper {
    constructor(baseUrl = 'https://ey.jobs') {
        this.baseUrl = baseUrl;
        this.session = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 10000
        });
    }

    async getJobsPage(searchUrl = null) {
        const url = searchUrl || 'https://ey.jobs/jobs/';
        
        // Load existing jobs from JSON to check for duplicates
        const existingJobs = await this.loadExistingJobs('ey_jobs.json');
        const existingJobsKeys = new Set(); // Track existing job keys to prevent duplicates
        existingJobs.forEach(job => {
            const key = job.requisition_id || job.url || job.application_url;
            if (key) {
                existingJobsKeys.add(key);
            }
        });
        if (existingJobs.length > 0) {
            console.log(`Loaded ${existingJobs.length} existing jobs from JSON - will check for duplicates`);
        }
        
        // Use Puppeteer for JavaScript-rendered content (Nuxt.js)
        console.log(`Launching browser to fetch: ${url}`);
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            userDataDir: undefined // Use default temp directory, but don't persist
        });
        
        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Block unnecessary resources for faster loading
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const type = req.resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
            
            console.log('Loading page and waiting for content...');
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            
            // Wait for Nuxt.js to render (optional - don't fail if not found)
            try {
                await page.waitForSelector('div[id="_nuxt"]', { timeout: 5000 });
            } catch (e) {
                console.log('Nuxt container not found, continuing anyway...');
            }
            
            // Wait for content to render - try multiple selectors that might indicate jobs are loaded
            console.log('Waiting for job listings to render...');
            try {
                // Try waiting for common job listing patterns
                await Promise.race([
                    page.waitForSelector('a[href*="/job"]', { timeout: 15000 }).catch(() => null),
                    page.waitForSelector('[class*="job"]', { timeout: 15000 }).catch(() => null),
                    page.waitForSelector('[class*="result"]', { timeout: 15000 }).catch(() => null),
                    page.waitForSelector('main', { timeout: 15000 }).catch(() => null),
                    new Promise(resolve => setTimeout(resolve, 8000)) // Fallback: wait 8 seconds
                ]);
            } catch (e) {
                // Continue anyway
                console.log('Selectors not found, using fallback timeout...');
            }
            
            // Click "more" button repeatedly until it disappears, saving jobs incrementally
            console.log('Loading all jobs by clicking "more" button or scrolling...');
            let clickCount = 0;
            let scrollCount = 0;
            let moreButtonExists = true;
            const maxClicks = 5000; // Increased safety limit for large job counts
            const maxScrolls = 500; // Max scroll attempts after button disappears
            const seenJobUrls = new Set(); // Track jobs we've already seen in this session
            const allJobs = []; // Collect newly scraped jobs (existing jobs are preserved in JSON)
            let noNewJobsCount = 0; // Track consecutive iterations with no new jobs
            
            while (moreButtonExists && clickCount < maxClicks) {
                try {
                    // Find the "more" button using selectors
                    const buttonInfo = await page.evaluate(() => {
                        // Look for buttons/links containing "more" (case insensitive) - expanded patterns
                        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], div[onclick], span[onclick]'));
                        const moreBtn = buttons.find(btn => {
                            const text = btn.textContent?.toLowerCase().trim() || '';
                            // Match various "more" button patterns
                            return text === 'more' || 
                                   text === 'load more' ||
                                   text === 'show more' ||
                                   text.includes('load more') ||
                                   text.includes('show more') ||
                                   text.includes('view more') ||
                                   text.includes('see more') ||
                                   (text.includes('more') && text.length < 30);
                        });
                        
                        if (moreBtn) {
                            // Get selector or create a unique identifier
                            let selector = null;
                            if (moreBtn.id) {
                                selector = `#${moreBtn.id}`;
                            } else if (moreBtn.className) {
                                const classes = moreBtn.className.split(' ').filter(c => c).join('.');
                                if (classes) {
                                    selector = `${moreBtn.tagName.toLowerCase()}.${classes}`;
                                }
                            }
                            
                            // If no good selector, use XPath or position
                            if (!selector) {
                                const index = Array.from(moreBtn.parentElement?.children || []).indexOf(moreBtn);
                                selector = `${moreBtn.tagName.toLowerCase()}:nth-of-type(${index + 1})`;
                            }
                            
                            return {
                                found: true,
                                selector: selector,
                                tagName: moreBtn.tagName.toLowerCase(),
                                text: moreBtn.textContent?.trim() || ''
                            };
                        }
                        return { found: false };
                    });
                    
                    if (buttonInfo.found) {
                        // Try multiple methods to click the button
                        let clicked = false;
                        
                        // Method 1: Try using the selector
                        if (buttonInfo.selector) {
                            try {
                                const button = await page.$(buttonInfo.selector);
                                if (button) {
                                    await button.scrollIntoView();
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                    await button.click();
                                    clicked = true;
                                }
                            } catch (e) {
                                // Try next method
                            }
                        }
                        
                        // Method 2: Use XPath to find by text
                        if (!clicked) {
                            try {
                                const [button] = await page.$x(`//${buttonInfo.tagName}[contains(text(), 'more') or contains(text(), 'More')]`);
                                if (button) {
                                    await button.scrollIntoView();
                                    await new Promise(resolve => setTimeout(resolve, 300));
                                    await button.click();
                                    clicked = true;
                                }
                            } catch (e) {
                                // Try next method
                            }
                        }
                        
                        // Method 3: Use evaluate to click directly (most reliable)
                        if (!clicked) {
                            try {
                                await page.evaluate(() => {
                                    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], div[onclick], span[onclick]'));
                                    const moreBtn = buttons.find(btn => {
                                        const text = btn.textContent?.toLowerCase().trim() || '';
                                        return text === 'more' || 
                                               text === 'load more' ||
                                               text === 'show more' ||
                                               text.includes('load more') ||
                                               text.includes('show more') ||
                                               text.includes('view more') ||
                                               text.includes('see more') ||
                                               (text.includes('more') && text.length < 30);
                                    });
                                    if (moreBtn) {
                                        moreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        moreBtn.click();
                                    }
                                });
                                clicked = true;
                            } catch (e) {
                                // Frame might be detached, but click might have worked
                                clicked = true; // Assume it worked
                            }
                        }
                        
                        if (clicked) {
                            clickCount++;
                            console.log(`  Clicked "more" button (${clickCount})...`);
                            
                            // Wait for new content to load (optimized for speed)
                            await new Promise(resolve => setTimeout(resolve, 400));
                            
                            // Parse new jobs (but don't enrich yet - that happens after all are collected)
                            const currentHtml = await page.content();
                            const newJobs = this.parseJobs(currentHtml);
                            
                            // Filter out jobs we've already seen (both in this session and in existing JSON)
                            const uniqueNewJobs = newJobs.filter(job => {
                                const key = job.requisition_id || job.url || job.application_url;
                                if (!key) return false; // Skip jobs without identifier
                                
                                // Check if we've seen it in this session
                                if (seenJobUrls.has(key)) {
                                    return false;
                                }
                                
                                // Check if it exists in the JSON file
                                if (existingJobsKeys.has(key)) {
                                    return false;
                                }
                                
                                // New unique job
                                seenJobUrls.add(key);
                                existingJobsKeys.add(key); // Add to existing set to prevent duplicates in future iterations
                                return true;
                            });
                            
                            if (uniqueNewJobs.length > 0) {
                                allJobs.push(...uniqueNewJobs);
                                noNewJobsCount = 0; // Reset counter when we find new jobs
                                console.log(`    Found ${uniqueNewJobs.length} new jobs (total: ${allJobs.length})`);
                                
                                // Save incrementally to JSON (basic info only, will be enriched later)
                                await this.saveToJsonIncremental(allJobs, 'ey_jobs.json');
                            } else {
                                noNewJobsCount++;
                                if (noNewJobsCount >= 10) {
                                    console.log('    No new jobs found for 10 consecutive clicks, stopping...');
                                    moreButtonExists = false;
                                }
                            }
                            
                            // Check if button still exists
                            moreButtonExists = await page.evaluate(() => {
                                const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], div[onclick], span[onclick]'));
                                return buttons.some(btn => {
                                    const text = btn.textContent?.toLowerCase().trim() || '';
                                    return text === 'more' || 
                                           text === 'load more' ||
                                           text === 'show more' ||
                                           text.includes('load more') ||
                                           text.includes('show more') ||
                                           text.includes('view more') ||
                                           text.includes('see more') ||
                                           (text.includes('more') && text.length < 30);
                                });
                            });
                        } else {
                            moreButtonExists = false;
                        }
                    } else {
                        moreButtonExists = false;
                    }
                } catch (error) {
                    console.log(`    Error clicking button: ${error.message}`);
                    moreButtonExists = false;
                }
            }
            
            if (clickCount > 0) {
                console.log(`✓ Clicked "more" button ${clickCount} times.`);
            } else {
                console.log('No "more" button found, trying infinite scroll...');
            }
            
            // Fallback: Try infinite scroll if no more button or button disappeared
            console.log('Checking for infinite scroll / additional content...');
            let prevJobCount = allJobs.length;
            
            while (scrollCount < maxScrolls && noNewJobsCount < 5) {
                try {
                    // Scroll to bottom of page
                    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
                    await new Promise(resolve => setTimeout(resolve, 800));
                    scrollCount++;
                    
                    // Parse new jobs after scroll
                    const currentHtml = await page.content();
                    const newJobs = this.parseJobs(currentHtml);
                    
                    // Filter out duplicates
                    const uniqueNewJobs = newJobs.filter(job => {
                        const key = job.requisition_id || job.url || job.application_url;
                        if (!key) return false;
                        if (seenJobUrls.has(key) || existingJobsKeys.has(key)) return false;
                        seenJobUrls.add(key);
                        existingJobsKeys.add(key);
                        return true;
                    });
                    
                    if (uniqueNewJobs.length > 0) {
                        allJobs.push(...uniqueNewJobs);
                        noNewJobsCount = 0;
                        console.log(`  Scroll ${scrollCount}: Found ${uniqueNewJobs.length} new jobs (total: ${allJobs.length})`);
                        await this.saveToJsonIncremental(allJobs, 'ey_jobs.json');
                    } else {
                        noNewJobsCount++;
                    }
                    
                    // Also try clicking "more" button again in case it reappeared
                    const buttonReappeared = await page.evaluate(() => {
                        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                        const moreBtn = buttons.find(btn => {
                            const text = btn.textContent?.toLowerCase().trim() || '';
                            return text.includes('more') && text.length < 30;
                        });
                        if (moreBtn) {
                            moreBtn.click();
                            return true;
                        }
                        return false;
                    });
                    
                    if (buttonReappeared) {
                        clickCount++;
                        noNewJobsCount = 0;
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                    
                } catch (e) {
                    noNewJobsCount++;
                }
            }
            
            if (scrollCount > 0) {
                console.log(`✓ Scrolled ${scrollCount} times. Total jobs found: ${allJobs.length}`);
            }
            
            // Final parse of all loaded jobs
            console.log('Finalizing content load...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const htmlContent = await page.content();
            
            // Parse final set of jobs and merge with what we already have
            const finalJobs = this.parseJobs(htmlContent);
            const finalUniqueJobs = finalJobs.filter(job => {
                const key = job.requisition_id || job.url || job.application_url;
                if (!key) return false; // Skip jobs without identifier
                
                // Check if we've seen it in this session
                if (seenJobUrls.has(key)) {
                    return false;
                }
                
                // Check if it exists in the JSON file
                if (existingJobsKeys.has(key)) {
                    return false;
                }
                
                // New unique job
                seenJobUrls.add(key);
                existingJobsKeys.add(key); // Add to existing set
                return true;
            });
            
            if (finalUniqueJobs.length > 0) {
                allJobs.push(...finalUniqueJobs);
                console.log(`  Found ${finalUniqueJobs.length} additional jobs in final parse (total: ${allJobs.length})`);
                await this.saveToJsonIncremental(allJobs, 'ey_jobs.json');
            }
            
            // Close browser with error handling
            try {
                await page.close();
                await browser.close();
            } catch (closeError) {
                // Ignore cleanup errors (Windows file locking)
                try {
                    await browser.close();
                } catch (e) {
                    // Ignore
                }
            }
            
            console.log(`Successfully fetched: ${url}`);
            
            // Return the accumulated jobs
            return {
                data: htmlContent, // Keep for compatibility
                status: 200,
                url: url,
                accumulatedJobs: allJobs // Use this for incremental jobs
            };
        } catch (error) {
            await browser.close();
            console.log(`Failed to fetch ${url}: ${error.message}`);
            return null;
        }
    }

    parseJobs(htmlContent) {
        const $ = cheerio.load(htmlContent);
        const jobs = [];

        // Try multiple common patterns for job listings
        let jobElements = $('div, article, li')
            .filter((i, el) => {
                const className = $(el).attr('class') || '';
                return /job|listing|position|opening/i.test(className);
            });

        if (jobElements.length === 0) {
            // Try finding any links that might be job links
            jobElements = $('a[href*="/job"], a[href*="/position"], a[href*="/career"]');
        }

        console.log(`Found ${jobElements.length} potential job elements`);

        let filteredCount = 0;
        jobElements.each((i, element) => {
            try {
                const job = this.extractJobData($, $(element));
                if (job && job.title) {
                    // Filter out entry-level and internships
                    if (this.isEntryLevelOrInternship(job)) {
                        filteredCount++;
                        return;
                    }
                    jobs.push(job);
                }
            } catch (error) {
                console.log(`Error extracting job data: ${error.message}`);
            }
        });

        if (filteredCount > 0) {
            console.log(`Filtered out ${filteredCount} entry-level/internship roles`);
        }

        return jobs;
    }

    isEntryLevelOrInternship(job) {
        const title = (job.title || '').toLowerCase();
        const department = (job.department || '').toLowerCase();
        const url = (job.url || '').toLowerCase();

        const exclusionKeywords = [
            'intern', 'internship', 'co-op', 'coop', 'student',
            'entry level', 'entry-level', 'graduate program',
            'campus', 'university', 'new grad', 'new graduate',
            'trainee', 'apprentice', 'rotational program', 'early career',
            'campus recruiting', 'university recruiting'
        ];

        // Check title
        for (const keyword of exclusionKeywords) {
            if (title.includes(keyword)) return true;
        }

        // Check department/type
        for (const keyword of exclusionKeywords) {
            if (department.includes(keyword)) return true;
        }

        // Check URL
        if (['intern', 'entry', 'campus', 'graduate'].some(kw => url.includes(kw))) {
            return true;
        }

        return false;
    }

    extractJobData($, $element) {
        const job = {
            company: 'EY',
            scraped_at: new Date().toISOString()
        };

        // Try to find title
        const titleElem = $element.find('h1, h2, h3, h4')
            .filter((i, el) => {
                const className = $(el).attr('class') || '';
                return /title|heading/i.test(className);
            })
            .first();

        if (titleElem.length) {
            job.title = titleElem.text().trim();
        } else {
            const titleLink = $element.find('a').filter((i, el) => {
                const className = $(el).attr('class') || '';
                return /title|job/i.test(className);
            }).first();
            
            if (titleLink.length) {
                job.title = titleLink.text().trim();
            } else if ($element.is('a')) {
                job.title = $element.text().trim();
            } else {
                const titleSpan = $element.find('span').filter((i, el) => {
                    const className = $(el).attr('class') || '';
                    return /title|position/i.test(className);
                }).first();
                if (titleSpan.length) {
                    job.title = titleSpan.text().trim();
                }
            }
        }

        // Try to find link
        const linkElem = $element.is('a') ? $element : $element.find('a[href]').first();
        if (linkElem.length && linkElem.attr('href')) {
            let href = linkElem.attr('href');
            job.url = href.startsWith('http') ? href : new URL(href, this.baseUrl).href;
            job.application_url = job.url; // Will be updated from detail page
            
            // Extract job ID if present in URL
            const jobIdMatch = href.match(/\/(\d+)\/?$/);
            if (jobIdMatch) {
                job.job_id = jobIdMatch[1];
            }
            
            // Try to extract requisition ID from URL (pattern like /ABC123DEF/job/)
            const reqIdMatch = href.match(/\/([A-Z0-9]{8,})\/job\//);
            if (reqIdMatch) {
                job.requisition_id = reqIdMatch[1];
            }
        }
        
        // Try to extract service line and rank from title
        if (job.title) {
            // Service Line (USA - Consulting - ...)
            const serviceLineMatch = job.title.match(/(?:USA\s*-\s*)?(Consulting|Assurance|Tax|Strategy|Advisory)/i);
            if (serviceLineMatch) {
                job.service_line = serviceLineMatch[1];
            }
            
            // Rank/Level (Staff, Senior, Manager, etc.)
            const rankMatch = job.title.match(/\b(Staff|Senior|Manager|Director|Associate|Supervising|Principal|Partner|Executive|Intern)\b/i);
            if (rankMatch) {
                job.rank_level = rankMatch[1];
            }
        }

        // Try to find location
        const locationElem = $element.find('span, div, p')
            .filter((i, el) => {
                const className = $(el).attr('class') || '';
                return /location|city|place/i.test(className);
            })
            .first();

        if (locationElem.length) {
            job.primary_location = locationElem.text().trim();
            job.location = job.primary_location; // Keep for backward compatibility
        } else {
            // Try to find location pattern in text
            const text = $element.text();
            const locationMatch = text.match(/[A-Z][a-z]+,\s*[A-Z]{2}/);
            if (locationMatch) {
                job.primary_location = locationMatch[0].trim();
                job.location = job.primary_location; // Keep for backward compatibility
            }
        }

        // Try to find department/type
        const deptElem = $element.find('span, div')
            .filter((i, el) => {
                const className = $(el).attr('class') || '';
                return /department|type|category/i.test(className);
            })
            .first();

        if (deptElem.length) {
            job.department = deptElem.text().trim();
        }

        // Try to find level/experience requirement
        const levelElem = $element.find('span, div')
            .filter((i, el) => {
                const className = $(el).attr('class') || '';
                return /level|experience|years/i.test(className);
            })
            .first();

        if (levelElem.length) {
            job.level = levelElem.text().trim();
        }

        // Try to find posted date
        const dateElem = $element.find('span, div, time')
            .filter((i, el) => {
                const className = $(el).attr('class') || '';
                return /date|posted|time/i.test(className);
            })
            .first();

        if (dateElem.length) {
            job.posted_date = dateElem.text().trim();
        }

        return job;
    }

    async fetchJobDetails(jobUrl, browser = null) {
        /** Fetch comprehensive job details from individual job page
         * @param {string} jobUrl - URL of the job page
         * @param {Browser} browser - Optional browser instance to reuse
         */
        if (!jobUrl || !jobUrl.includes('/job/')) {
            return null;
        }

        let shouldCloseBrowser = false;
        if (!browser) {
            browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            shouldCloseBrowser = true;
        }

        try {
            const page = await browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            
            // Block unnecessary resources for faster loading
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const type = req.resourceType();
                if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                    req.abort();
                } else {
                    req.continue();
                }
            });
            
            await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
            await new Promise(resolve => setTimeout(resolve, 200));
            
            const htmlContent = await page.content();
            await page.close();
            
            const $ = cheerio.load(htmlContent);
            const allText = $('body').text();
            
            const details = {};
                
            // 1. Requisition ID (e.g., 148293BR) - Look for pattern like "123456BR" or "Requisition ID: 123456BR"
            const reqIdMatch = allText.match(/requisition\s*(?:id|#)?\s*:?\s*(\d+[A-Z]{2})/i) || 
                               allText.match(/(\d{6,}[A-Z]{2})/) ||
                               jobUrl.match(/([A-Z0-9]{8,})/);
            details.requisition_id = reqIdMatch ? reqIdMatch[1] : null;
            
            // 2. Job Title - Get from h1 or main heading
            const titleElem = $('h1').first() || $('[class*="title"]').first() || $('title');
            details.title = titleElem.length ? titleElem.text().trim() : null;
            
            // 3. Application URL - Usually the same as jobUrl, but look for apply button
            const applyLink = $('a[href*="apply"], button[onclick*="apply"], a:contains("Apply")').first();
            details.application_url = applyLink.length && applyLink.attr('href') 
                ? (applyLink.attr('href').startsWith('http') ? applyLink.attr('href') : new URL(applyLink.attr('href'), jobUrl).href)
                : jobUrl;
            
            // 4. Service Line (Consulting, Assurance, Tax, Strategy)
            const serviceLineMatch = allText.match(/(?:service\s*line|department)[\s:]+(consulting|assurance|tax|strategy|advisory)/i) ||
                                    details.title?.match(/(?:USA\s*-\s*)?(Consulting|Assurance|Tax|Strategy|Advisory)/i);
            details.service_line = serviceLineMatch ? serviceLineMatch[1] : null;
            
            // 5. Sub-Service Line (Cybersecurity, Supply Chain, Audit, etc.)
            const subServiceMatch = allText.match(/(?:sub-?service\s*line|team|practice)[\s:]+([^.\n]{3,50})/i) ||
                                  details.title?.match(/-\s*([^-]+?)\s*-\s*(Staff|Senior|Manager|Director|Associate)/i);
            details.sub_service_line = subServiceMatch ? subServiceMatch[1].trim() : null;
            
            // 6. Rank/Level (Staff, Senior, Manager, Director, Associate)
            const levelMatch = allText.match(/(staff|senior|manager|director|associate|supervising|principal|partner|executive)/i) ||
                             details.title?.match(/(Staff|Senior|Manager|Director|Associate|Supervising|Principal|Partner|Executive)/i);
            details.rank_level = levelMatch ? levelMatch[1] : null;
            
            // 7. Primary Location
            const primaryLocMatch = allText.match(/(?:primary\s*location|location)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/i) ||
                                   allText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/);
            details.primary_location = primaryLocMatch ? primaryLocMatch[1] : null;
            
            // 8. Secondary Locations
            const secondaryLocMatch = allText.match(/(?:secondary\s*locations?|additional\s*locations?|multiple\s*locations?)[\s:]+([^.\n]{10,200})/i);
            details.secondary_locations = secondaryLocMatch ? secondaryLocMatch[1].trim() : null;
            
            // 9. Work Model (Remote, Hybrid, On-site)
            const workModelMatch = allText.match(/(?:work\s*model|work\s*arrangement|work\s*type)[\s:]+(remote|hybrid|on-?site|on\s*site|in-?person)/i) ||
                                 allText.match(/\b(remote|hybrid|on-?site|on\s*site|in-?person)\b/i);
            details.work_model = workModelMatch ? workModelMatch[1] : null;
            
            // 10. Travel Percentage
            const travelMatch = allText.match(/(\d+)\s*%?\s*travel/i) ||
                              allText.match(/travel[\s:]+(\d+)\s*%/i);
            details.travel_percentage = travelMatch ? `${travelMatch[1]}%` : null;
            
            // 11. Full Description - Get entire job posting content
            let description = null;
            
            // Strategy: Get main content area and extract meaningful text
            // Remove navigation, headers, footers, scripts, styles
            const mainContent = $('main, article, [role="main"]').first();
            if (mainContent.length) {
                // Clone to avoid modifying original
                const content = mainContent.clone();
                content.find('nav, header, footer, script, style, .nav, .header, .footer').remove();
                description = content.text().trim();
            }
            
            // If that didn't work or is too short, try specific selectors
            if (!description || description.length < 300) {
                const descSelectors = [
                    '[class*="description"]',
                    '[class*="job-description"]',
                    '[class*="details"]',
                    '[class*="content"]',
                    '[id*="description"]',
                    '[id*="job-details"]',
                    '.job-content',
                    '.job-details',
                    '[data-job-description]'
                ];
                
                for (const selector of descSelectors) {
                    const descElem = $(selector).first();
                    if (descElem.length) {
                        const text = descElem.text().trim();
                        if (text.length > 300) {
                            description = text;
                            break;
                        }
                    }
                }
            }
            
            // Fallback: Get all paragraphs from main content
            if (!description || description.length < 300) {
                const paragraphs = $('main p, article p, [class*="description"] p, [class*="content"] p')
                    .map((i, el) => $(el).text().trim())
                    .get()
                    .filter(p => p.length > 30); // Filter out very short paragraphs
                
                if (paragraphs.length > 0) {
                    description = paragraphs.join('\n\n');
                }
            }
            
            // Last resort: Use body text but clean it up
            if (!description || description.length < 300) {
                // Get text but exclude common page elements
                const bodyText = $('body').text();
                const lines = bodyText.split('\n')
                    .map(l => l.trim())
                    .filter(l => l.length > 50 && 
                            !l.match(/^(home|about|contact|privacy|cookie|menu|navigation)/i) &&
                            !l.match(/^[A-Z\s]{1,3}$/)); // Filter single letter lines
                description = lines.join('\n').substring(0, 20000); // Limit to 20k chars
            }
            
            details.description = description || null;
            
            // 12. Date Posted
            const dateMatch = allText.match(/(?:posted|date\s*posted|posted\s*date)[\s:]+([^.\n]{5,30})/i) ||
                            $('[class*="date"], [class*="posted"], time').first().text().trim();
            details.posted_date = dateMatch ? (typeof dateMatch === 'string' ? dateMatch : dateMatch[1]) : null;
            
            // 13. Qualifications/Skills - Look for specific sections
            let qualifications = null;
            
            // Method 1: Find headings that indicate qualifications/skills sections
            const headings = $('h1, h2, h3, h4, h5, h6');
            headings.each((i, heading) => {
                const headingText = $(heading).text().toLowerCase();
                if (headingText.includes('qualification') || 
                    headingText.includes('requirement') || 
                    headingText.includes('skill') ||
                    headingText.includes('to qualify') ||
                    headingText.includes('what we look for') ||
                    headingText.includes('skills and attributes')) {
                    
                    // Get content after this heading until next heading
                    let sectionText = '';
                    $(heading).nextUntil('h1, h2, h3, h4, h5, h6').each((j, el) => {
                        const text = $(el).text().trim();
                        if (text.length > 10) {
                            sectionText += text + '\n';
                        }
                    });
                    
                    // Also get any lists
                    const lists = $(heading).nextUntil('h1, h2, h3, h4, h5, h6').find('ul, ol');
                    if (lists.length > 0) {
                        lists.each((j, list) => {
                            const items = $(list).find('li').map((k, li) => $(li).text().trim()).get();
                            sectionText += items.join('\n') + '\n';
                        });
                    }
                    
                    if (sectionText.trim().length > 50) {
                        qualifications = sectionText.trim();
                        return false; // Break the loop
                    }
                }
            });
            
            // Method 2: Try finding by class/id
            if (!qualifications || qualifications.length < 50) {
                const qualSelectors = [
                    '[class*="qualification"]',
                    '[class*="requirement"]',
                    '[class*="skill"]',
                    '[class*="competency"]',
                    '[id*="qualification"]',
                    '[id*="requirement"]',
                    '[id*="skill"]'
                ];
                
                for (const selector of qualSelectors) {
                    const qualElem = $(selector).first();
                    if (qualElem.length) {
                        // Check if it's a list
                        const listItems = qualElem.find('li');
                        if (listItems.length > 0) {
                            qualifications = listItems.map((i, el) => $(el).text().trim()).get().join('\n');
                        } else {
                            qualifications = qualElem.text().trim();
                        }
                        if (qualifications && qualifications.length > 50) break;
                    }
                }
            }
            
            // Method 3: Look for text patterns in the description
            if (!qualifications || qualifications.length < 50) {
                const qualPatterns = [
                    /(?:to\s*qualify\s*for\s*this\s*role|skills?\s*and\s*attributes\s*for\s*success|requirements?)[\s:]+([\s\S]{100,5000})/i,
                    /(?:ideally|preferred|required|must\s*have)[\s\S]{50,3000}/i,
                    /(?:qualifications?|requirements?)[\s:]+([\s\S]{100,3000})/i
                ];
                
                for (const pattern of qualPatterns) {
                    const match = allText.match(pattern);
                    if (match) {
                        qualifications = (match[1] || match[0]).trim();
                        if (qualifications.length > 50) break;
                    }
                }
            }
            
            // Method 4: Extract from description if it contains qualification keywords
            if ((!qualifications || qualifications.length < 50) && description) {
                const qualKeywords = ['qualify', 'requirement', 'skill', 'experience', 'degree', 'certification'];
                const descLines = description.split('\n');
                let qualStart = -1;
                
                for (let i = 0; i < descLines.length; i++) {
                    const line = descLines[i].toLowerCase();
                    if (qualKeywords.some(kw => line.includes(kw)) && 
                        (line.includes('qualify') || line.includes('requirement') || line.includes('must have'))) {
                        qualStart = i;
                        break;
                    }
                }
                
                if (qualStart >= 0) {
                    qualifications = descLines.slice(qualStart, qualStart + 20).join('\n').trim();
                }
            }
            
            details.qualifications_skills = qualifications || null;
            
            return details;
        } catch (error) {
            if (shouldCloseBrowser) {
                try {
                    await browser.close();
                } catch (e) {
                    // Ignore
                }
            }
            return null;
        }
    }

    async enrichJobsWithDetails(jobs, parallelLimit = 10) {
        /** Add description and skills to each job by visiting detail pages
         * @param {Array} jobs - Array of jobs to enrich
         * @param {number} parallelLimit - Number of jobs to fetch in parallel (default: 15)
         */
        if (!jobs || jobs.length === 0) return jobs;
        
        console.log(`\nEnriching ${jobs.length} jobs with descriptions and skills...`);
        console.log(`Using parallel processing (${parallelLimit} tabs at a time).\n`);
        
        // Filter out jobs that don't need enrichment
        const jobsToEnrich = [];
        const jobsToSkip = [];
        
        jobs.forEach(job => {
            // Skip navigation links and non-job entries
            if (!job.url || !job.url.includes('/job/') || 
                job.title?.toLowerCase().includes('view all') ||
                job.title?.toLowerCase().includes('more') ||
                job.url.includes('/locations/') ||
                job.url.includes('/job-titles/')) {
                jobsToSkip.push(job);
            } else if (job.description && job.qualifications_skills) {
                // Job already has full details, skip enrichment
                jobsToSkip.push(job);
            } else {
                jobsToEnrich.push(job);
            }
        });
        
        console.log(`  ${jobsToSkip.length} jobs skipped (already have details or invalid)`);
        console.log(`  ${jobsToEnrich.length} jobs need enrichment\n`);
        
        if (jobsToEnrich.length === 0) {
            return jobs;
        }
        
        const enrichedJobs = [...jobsToSkip];
        let successCount = 0;
        let failedCount = 0;
        
        // Single browser with multiple tabs (much faster than multiple browsers)
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
        
        try {
            // Create a pool of pages (tabs) for parallel processing
            const pagePool = await Promise.all(
                Array(parallelLimit).fill().map(async () => {
                    const page = await browser.newPage();
                    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
                    
                    // Block unnecessary resources
                    await page.setRequestInterception(true);
                    page.on('request', (req) => {
                        const type = req.resourceType();
                        if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
                            req.abort();
                        } else {
                            req.continue();
                        }
                    });
                    return page;
                })
            );
            
            // Process jobs in parallel batches using page pool
            for (let i = 0; i < jobsToEnrich.length; i += parallelLimit) {
                const batch = jobsToEnrich.slice(i, i + parallelLimit);
                
                // Fetch all jobs in this batch in parallel using page pool
                const batchPromises = batch.map(async (job, index) => {
                    const page = pagePool[index];
                    try {
                        // Longer timeout and networkidle2 for JS-heavy pages
                        await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 25000 });
                        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for JS render
                        
                        const htmlContent = await page.content();
                        const details = this.parseJobDetailsFromHtml(htmlContent, job.url);
                        return { job, details };
                    } catch (error) {
                        console.log(`    Failed: ${job.url.substring(0, 60)}... - ${error.message}`);
                        return { job, details: null };
                    }
                });
                
                const batchResults = await Promise.all(batchPromises);
                
                // Process results
                batchResults.forEach(({ job, details }) => {
                    if (details && (details.description || details.qualifications_skills)) {
                        enrichedJobs.push({
                            ...job,
                            requisition_id: details.requisition_id || job.requisition_id,
                            title: details.title || job.title,
                            application_url: details.application_url || job.url,
                            service_line: details.service_line || job.service_line,
                            sub_service_line: details.sub_service_line,
                            rank_level: details.rank_level || job.rank_level || job.level,
                            primary_location: details.primary_location || job.primary_location || job.location,
                            secondary_locations: details.secondary_locations,
                            work_model: details.work_model,
                            travel_percentage: details.travel_percentage,
                            description: details.description || job.description,
                            qualifications_skills: details.qualifications_skills || job.qualifications_skills,
                            posted_date: details.posted_date || job.posted_date
                        });
                        successCount++;
                    } else {
                        enrichedJobs.push(job);
                        failedCount++;
                    }
                });
                
                // Progress indicator
                const processed = Math.min(i + parallelLimit, jobsToEnrich.length);
                console.log(`  Progress: ${processed}/${jobsToEnrich.length} jobs processed (${successCount} enriched, ${failedCount} failed)`);
                
                // Delay between batches to avoid rate limiting
                if (i + parallelLimit < jobsToEnrich.length) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            
            // Close all pages and browser
            await Promise.all(pagePool.map(page => page.close().catch(() => {})));
            await browser.close();
            
            console.log(`\n✓ Enrichment complete: ${successCount} jobs enriched, ${failedCount} failed, ${jobsToSkip.length} skipped\n`);
            return enrichedJobs;
        } catch (error) {
            await browser.close().catch(() => {});
            throw error;
        }
    }
    
    parseJobDetailsFromHtml(htmlContent, jobUrl) {
        /** Parse job details from HTML without needing puppeteer page context */
        const cheerio = require('cheerio');
        const $ = cheerio.load(htmlContent);
        const allText = $('body').text();
        
        const details = {};
            
        // 1. Requisition ID
        const reqIdMatch = allText.match(/requisition\s*(?:id|#)?\s*:?\s*(\d+[A-Z]{2})/i) || 
                           allText.match(/(\d{6,}[A-Z]{2})/) ||
                           jobUrl.match(/([A-Z0-9]{8,})/);
        details.requisition_id = reqIdMatch ? reqIdMatch[1] : null;
        
        // 2. Job Title
        const titleElem = $('h1').first() || $('[class*="title"]').first() || $('title');
        details.title = titleElem.length ? titleElem.text().trim() : null;
        
        // 3. Application URL
        const applyLink = $('a[href*="apply"], button[onclick*="apply"], a:contains("Apply")').first();
        details.application_url = applyLink.length && applyLink.attr('href') 
            ? (applyLink.attr('href').startsWith('http') ? applyLink.attr('href') : new URL(applyLink.attr('href'), jobUrl).href)
            : jobUrl;
        
        // 4. Service Line
        const serviceLineMatch = allText.match(/(?:service\s*line|department)[\s:]+(consulting|assurance|tax|strategy|advisory)/i) ||
                                details.title?.match(/(?:USA\s*-\s*)?(Consulting|Assurance|Tax|Strategy|Advisory)/i);
        details.service_line = serviceLineMatch ? serviceLineMatch[1] : null;
        
        // 5. Sub-Service Line
        const subServiceMatch = allText.match(/(?:sub-?service\s*line|team|practice)[\s:]+([^.\n]{3,50})/i) ||
                              details.title?.match(/-\s*([^-]+?)\s*-\s*(Staff|Senior|Manager|Director|Associate)/i);
        details.sub_service_line = subServiceMatch ? subServiceMatch[1].trim() : null;
        
        // 6. Rank/Level
        const levelMatch = allText.match(/(staff|senior|manager|director|associate|supervising|principal|partner|executive)/i) ||
                         details.title?.match(/(Staff|Senior|Manager|Director|Associate|Supervising|Principal|Partner|Executive)/i);
        details.rank_level = levelMatch ? levelMatch[1] : null;
        
        // 7. Primary Location
        const primaryLocMatch = allText.match(/(?:primary\s*location|location)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/i) ||
                               allText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?,\s*[A-Z]{2})/);
        details.primary_location = primaryLocMatch ? primaryLocMatch[1] : null;
        
        // 8. Secondary Locations
        const secondaryLocMatch = allText.match(/(?:secondary\s*locations?|additional\s*locations?|multiple\s*locations?)[\s:]+([^.\n]{10,200})/i);
        details.secondary_locations = secondaryLocMatch ? secondaryLocMatch[1].trim() : null;
        
        // 9. Work Model
        const workModelMatch = allText.match(/(?:work\s*model|work\s*arrangement|work\s*type)[\s:]+(remote|hybrid|on-?site|on\s*site|in-?person)/i) ||
                             allText.match(/\b(remote|hybrid|on-?site|on\s*site|in-?person)\b/i);
        details.work_model = workModelMatch ? workModelMatch[1] : null;
        
        // 10. Travel Percentage
        const travelMatch = allText.match(/(\d+)\s*%?\s*travel/i) ||
                          allText.match(/travel[\s:]+(\d+)\s*%/i);
        details.travel_percentage = travelMatch ? `${travelMatch[1]}%` : null;
        
        // 11. Full Description
        let description = null;
        const mainContent = $('main, article, [role="main"]').first();
        if (mainContent.length) {
            const content = mainContent.clone();
            content.find('nav, header, footer, script, style, .nav, .header, .footer').remove();
            description = content.text().trim();
        }
        
        if (!description || description.length < 300) {
            const descSelectors = ['[class*="description"]', '[class*="job-description"]', '[class*="details"]', '[class*="content"]'];
            for (const selector of descSelectors) {
                const descElem = $(selector).first();
                if (descElem.length) {
                    const text = descElem.text().trim();
                    if (text.length > 300) {
                        description = text;
                        break;
                    }
                }
            }
        }
        
        if (!description || description.length < 300) {
            const paragraphs = $('main p, article p, [class*="description"] p')
                .map((i, el) => $(el).text().trim())
                .get()
                .filter(p => p.length > 30);
            if (paragraphs.length > 0) {
                description = paragraphs.join('\n\n');
            }
        }
        
        details.description = description || null;
        
        // 12. Date Posted
        const dateMatch = allText.match(/(?:posted|date\s*posted|posted\s*date)[\s:]+([^.\n]{5,30})/i) ||
                        $('[class*="date"], [class*="posted"], time').first().text().trim();
        details.posted_date = dateMatch ? (typeof dateMatch === 'string' ? dateMatch : dateMatch[1]) : null;
        
        // 13. Qualifications/Skills
        let qualifications = null;
        const headings = $('h1, h2, h3, h4, h5, h6');
        headings.each((i, heading) => {
            const headingText = $(heading).text().toLowerCase();
            if (headingText.includes('qualification') || headingText.includes('requirement') || 
                headingText.includes('skill') || headingText.includes('to qualify')) {
                let sectionText = '';
                $(heading).nextUntil('h1, h2, h3, h4, h5, h6').each((j, el) => {
                    const text = $(el).text().trim();
                    if (text.length > 10) sectionText += text + '\n';
                });
                if (sectionText.trim().length > 50) {
                    qualifications = sectionText.trim();
                    return false;
                }
            }
        });
        
        details.qualifications_skills = qualifications || null;
        
        return details;
    }

    analyzePageStructure(htmlContent) {
        const $ = cheerio.load(htmlContent);
        const analysis = {
            suggestions: [],
            repeatedStructures: [],
            potentialJobLinks: [],
            dataAttributes: []
        };

        console.log('\n=== Analyzing Page Structure ===\n');

        // 1. Find repeated structures (likely job listings)
        const allElements = $('div, article, li, section');
        const classFrequency = {};
        
        allElements.each((i, el) => {
            const className = $(el).attr('class');
            if (className) {
                const classes = className.split(/\s+/).filter(c => c.length > 0);
                classes.forEach(cls => {
                    classFrequency[cls] = (classFrequency[cls] || 0) + 1;
                });
            }
        });

        // Find classes that appear 3+ times (likely repeated job cards)
        const repeatedClasses = Object.entries(classFrequency)
            .filter(([cls, count]) => count >= 3 && count <= 100) // Reasonable range for job listings
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (repeatedClasses.length > 0) {
            console.log('Found repeated structures (likely job listings):');
            repeatedClasses.forEach(([cls, count]) => {
                console.log(`  - Class "${cls}": appears ${count} times`);
                analysis.repeatedStructures.push({
                    selector: `.${cls}`,
                    count: count,
                    suggestion: `Try: $('.${cls}')`
                });
            });
        }

        // 2. Find links that might be job links
        const allLinks = $('a[href]');
        const jobLinkPatterns = [];
        
        allLinks.each((i, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim();
            
            // Look for links with job-like patterns
            if (href.match(/\/job|\/position|\/career|\/search|\/req/i) || 
                (text.length > 10 && text.length < 100)) { // Reasonable job title length
                jobLinkPatterns.push({
                    href: href.substring(0, 100),
                    text: text.substring(0, 50),
                    parentClass: $(el).parent().attr('class') || 'none'
                });
            }
        });

        if (jobLinkPatterns.length > 0) {
            console.log(`\nFound ${jobLinkPatterns.length} potential job links:`);
            jobLinkPatterns.slice(0, 5).forEach((link, i) => {
                console.log(`  ${i + 1}. "${link.text}" -> ${link.href}`);
                if (link.parentClass !== 'none') {
                    console.log(`     Parent class: ${link.parentClass}`);
                }
            });
            analysis.potentialJobLinks = jobLinkPatterns;
        }

        // 3. Look for data attributes that might indicate jobs
        const dataAttrs = new Set();
        $('[data-job-id], [data-id], [data-position], [data-job]').each((i, el) => {
            Object.keys(el.attribs || {}).forEach(attr => {
                if (attr.startsWith('data-')) {
                    dataAttrs.add(attr);
                }
            });
        });

        if (dataAttrs.size > 0) {
            console.log('\nFound data attributes:');
            Array.from(dataAttrs).forEach(attr => {
                console.log(`  - ${attr}`);
                analysis.dataAttributes.push(attr);
            });
        }

        // 4. Try to find the main container
        const containers = $('main, [role="main"], #content, .content, .container, .results');
        if (containers.length > 0) {
            console.log('\nFound potential content containers:');
            containers.slice(0, 3).each((i, el) => {
                const className = $(el).attr('class') || '';
                const id = $(el).attr('id') || '';
                console.log(`  - ${el.tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ')[0] : ''}`);
            });
        }

        // 5. Generate suggestions
        if (repeatedClasses.length > 0) {
            const topClass = repeatedClasses[0][0];
            analysis.suggestions.push({
                priority: 'HIGH',
                selector: `.${topClass}`,
                description: `Most repeated class (${repeatedClasses[0][1]} occurrences)`
            });
        }

        if (jobLinkPatterns.length > 0) {
            const commonParent = jobLinkPatterns[0].parentClass;
            if (commonParent !== 'none') {
                analysis.suggestions.push({
                    priority: 'MEDIUM',
                    selector: `.${commonParent} a[href*="/job"]`,
                    description: 'Parent container of job links'
                });
            }
        }

        console.log('\n=== Analysis Complete ===\n');
        
        return analysis;
    }

    async scrape(searchUrl = null, includeDetails = false) {
        console.log('Starting EY job scraper...');
        console.log('Filtering: Excluding entry-level roles and internships');

        // Load existing jobs to compare against
        const existingJobs = await this.loadExistingJobs('ey_jobs.json');
        console.log(`Loaded ${existingJobs.length} existing jobs from ey_jobs.json`);
        
        // Create a map of existing jobs by requisition_id (or URL as fallback)
        const existingJobsMap = new Map();
        existingJobs.forEach(job => {
            const key = job.requisition_id || job.url || job.application_url;
            if (key) {
                existingJobsMap.set(key, job);
            }
        });

        const response = await this.getJobsPage(searchUrl);
        if (!response) {
            console.log('Failed to fetch jobs page');
            return existingJobs; // Return existing jobs if scrape fails
        }

        // Use accumulated jobs if available (from incremental loading), otherwise parse
        let scrapedJobs = [];
        if (response.accumulatedJobs && response.accumulatedJobs.length > 0) {
            scrapedJobs = response.accumulatedJobs;
            console.log(`Scraped ${scrapedJobs.length} jobs from website (after filtering, loaded incrementally)`);
        } else {
            scrapedJobs = this.parseJobs(response.data);
            console.log(`Scraped ${scrapedJobs.length} jobs from website (after filtering)`);
        }

        // If no jobs found, analyze the page structure
        if (scrapedJobs.length === 0) {
            console.log('\n⚠ No jobs found. Analyzing page structure...\n');
            const analysis = this.analyzePageStructure(response.data);
            
            // Save analysis to file
            await fs.writeFile('page_analysis.json', JSON.stringify(analysis, null, 2), 'utf8');
            console.log('Page analysis saved to page_analysis.json');
            return existingJobs; // Return existing jobs
        }

        // Filter out non-job entries (like "view all jobs")
        const validScrapedJobs = scrapedJobs.filter(job => {
            const title = (job.title || '').toLowerCase();
            const url = job.url || job.application_url || '';
            return !title.includes('view all') && 
                   !title.includes('more') &&
                   url.includes('/job/') &&
                   job.requisition_id; // Must have requisition_id to be valid
        });

        // Identify new jobs, existing jobs (with/without details), and removed jobs
        const scrapedJobsMap = new Map();
        const newJobs = [];
        const updatedJobs = [];
        const jobsNeedingEnrichment = []; // Existing jobs without descriptions
        
        validScrapedJobs.forEach(job => {
            const key = job.requisition_id || job.url || job.application_url;
            if (!key) return; // Skip jobs without identifier
            
            scrapedJobsMap.set(key, job);
            
            if (existingJobsMap.has(key)) {
                // Job already exists - merge with existing data
                const existing = existingJobsMap.get(key);
                const mergedJob = {
                    ...existing,
                    ...job,
                    scraped_at: new Date().toISOString()
                };
                
                // Check if job needs enrichment (missing description or skills)
                if (includeDetails && (!existing.description || !existing.qualifications_skills)) {
                    // Job exists but doesn't have full details - add to enrichment queue
                    jobsNeedingEnrichment.push(mergedJob);
                } else {
                    // Job has all details, just update basic info
                    updatedJobs.push(mergedJob);
                }
            } else {
                // New job found
                newJobs.push(job);
            }
        });

        // Find removed jobs (jobs that exist in our database but not on website)
        const removedJobs = [];
        existingJobs.forEach(job => {
            const key = job.requisition_id || job.url || job.application_url;
            if (key && !scrapedJobsMap.has(key)) {
                removedJobs.push(job);
            }
        });

        console.log(`\n📊 Job Comparison Results:`);
        console.log(`   New jobs found: ${newJobs.length}`);
        console.log(`   Existing jobs: ${updatedJobs.length}`);
        console.log(`   Removed jobs: ${removedJobs.length}`);

        // Combine new and updated jobs
        let finalJobs = [...updatedJobs];
        
        // Enrich jobs that need it (new jobs + existing jobs without descriptions)
        const jobsToEnrich = [...newJobs];
        if (jobsNeedingEnrichment.length > 0) {
            console.log(`\n⚠ Found ${jobsNeedingEnrichment.length} existing jobs without descriptions - will enrich them`);
            jobsToEnrich.push(...jobsNeedingEnrichment);
        }
        
        if (jobsToEnrich.length > 0) {
            if (includeDetails) {
                console.log(`\nEnriching ${jobsToEnrich.length} jobs with descriptions and skills...`);
                console.log(`  (${newJobs.length} new jobs + ${jobsNeedingEnrichment.length} existing jobs needing details)`);
                // Use parallel processing (10 jobs at a time) with browser reuse for maximum speed
                const enrichedJobs = await this.enrichJobsWithDetails(jobsToEnrich, 10);
                finalJobs.push(...enrichedJobs);
            } else {
                finalJobs.push(...jobsToEnrich);
            }
        }

        // Save the final job list (removed jobs are automatically excluded)
        await this.saveToJson(finalJobs, 'ey_jobs.json');
        
        if (removedJobs.length > 0) {
            console.log(`\n⚠ Removed ${removedJobs.length} jobs that are no longer on the website:`);
            removedJobs.slice(0, 5).forEach(job => {
                console.log(`   - ${job.title || 'Unknown'} (${job.requisition_id || job.url})`);
            });
            if (removedJobs.length > 5) {
                console.log(`   ... and ${removedJobs.length - 5} more`);
            }
        }

        if (newJobs.length > 0) {
            console.log(`\n✓ Added ${newJobs.length} new jobs`);
        }

        console.log(`\n✓ Final job count: ${finalJobs.length} jobs in ey_jobs.json`);
        
        return finalJobs;
    }

    async loadExistingJobs(filename = 'ey_jobs.json') {
        /** Load existing jobs from JSON file */
        try {
            const fileContent = await fs.readFile(filename, 'utf8');
            const jobs = JSON.parse(fileContent);
            return Array.isArray(jobs) ? jobs : [];
        } catch (error) {
            if (error.code === 'ENOENT') {
                // File doesn't exist yet, return empty array
                return [];
            }
            console.error(`Error loading existing jobs: ${error.message}`);
            return [];
        }
    }

    async saveToJson(jobs, filename = 'ey_jobs.json') {
        try {
            const jobsArray = jobs || [];
            const jsonContent = JSON.stringify(jobsArray, null, 2);
            await fs.writeFile(filename, jsonContent, 'utf8');
            console.log(`Saved ${jobsArray.length} jobs to ${filename}`);
        } catch (error) {
            console.error(`Error saving to JSON: ${error.message}`);
        }
    }

    async saveToJsonIncremental(jobs, filename = 'ey_jobs.json') {
        /** Save jobs incrementally, ensuring no duplicates by merging with existing file */
        try {
            const jobsArray = jobs || [];
            
            // Load existing jobs to merge and deduplicate
            const existingJobs = await this.loadExistingJobs(filename);
            const existingJobsMap = new Map();
            existingJobs.forEach(job => {
                const key = job.requisition_id || job.url || job.application_url;
                if (key) {
                    existingJobsMap.set(key, job);
                }
            });
            
            // Merge new jobs with existing, keeping existing data for duplicates
            const mergedJobsMap = new Map(existingJobsMap);
            jobsArray.forEach(job => {
                const key = job.requisition_id || job.url || job.application_url;
                if (key) {
                    // If job exists, merge (keep existing data, update with new)
                    if (mergedJobsMap.has(key)) {
                        const existing = mergedJobsMap.get(key);
                        mergedJobsMap.set(key, {
                            ...existing,
                            ...job,
                            scraped_at: new Date().toISOString()
                        });
                    } else {
                        // New job
                        mergedJobsMap.set(key, job);
                    }
                }
            });
            
            // Convert map back to array
            const finalJobs = Array.from(mergedJobsMap.values());
            
            const jsonContent = JSON.stringify(finalJobs, null, 2);
            await fs.writeFile(filename, jsonContent, 'utf8');
            // Don't log every time to avoid spam, only log periodically
            if (finalJobs.length % 50 === 0 || finalJobs.length < 50) {
                console.log(`    Saved ${finalJobs.length} jobs to ${filename} (${finalJobs.length - existingJobs.length} new)`);
            }
        } catch (error) {
            console.error(`Error saving to JSON: ${error.message}`);
        }
    }

    printJobs(jobs) {
        if (!jobs || jobs.length === 0) {
            console.log('No jobs found');
            return;
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log(`Found ${jobs.length} jobs:`);
        console.log(`${'='.repeat(60)}\n`);

        jobs.forEach((job, i) => {
            console.log(`Job ${i + 1}:`);
            console.log(`  Title: ${job.title || 'N/A'}`);
            console.log(`  Location: ${job.location || 'N/A'}`);
            console.log(`  URL: ${job.url || 'N/A'}`);
            if (job.department) {
                console.log(`  Department: ${job.department}`);
            }
            console.log();
        });
    }
}

async function main() {
    const scraper = new EYScraper();
    
    // Scrape from https://ey.jobs/jobs/ with full enrichment enabled
    const jobs = await scraper.scrape('https://ey.jobs/jobs/', true); // true = includeDetails

    if (jobs && jobs.length > 0) {
        console.log(`\n✓ Successfully scraped ${jobs.length} jobs with enrichment`);
        // Already saved during scrape, just print summary
        scraper.printJobs(jobs.slice(0, 10)); // Print first 10 as sample
    } else {
        console.log('\nNo jobs found. The page structure might be different.');
        console.log('Try inspecting the actual EY career page HTML to adjust selectors.');
        console.log('\nSaving page HTML for inspection...');
        const response = await scraper.getJobsPage('https://ey.jobs/jobs/');
        if (response) {
            await fs.writeFile('ey_page_debug.html', response.data, 'utf8');
            console.log('Saved page HTML to \'ey_page_debug.html\' for inspection');
        }
    }
}

// Enrich existing jobs that are missing descriptions
async function enrichExisting() {
    const scraper = new EYScraper();
    
    console.log('Loading existing jobs to enrich...');
    const existingJobs = await scraper.loadExistingJobs('ey_jobs.json');
    console.log(`Loaded ${existingJobs.length} existing jobs`);
    
    // Find jobs without descriptions
    const jobsNeedingEnrichment = existingJobs.filter(job => 
        !job.description || job.description.length < 100
    );
    
    console.log(`Found ${jobsNeedingEnrichment.length} jobs needing enrichment`);
    
    if (jobsNeedingEnrichment.length === 0) {
        console.log('All jobs already have descriptions!');
        return;
    }
    
    // Enrich them
    const enrichedJobs = await scraper.enrichJobsWithDetails(jobsNeedingEnrichment, 10);
    
    // Merge back with jobs that already had descriptions
    const jobsWithDescriptions = existingJobs.filter(job => 
        job.description && job.description.length >= 100
    );
    
    const finalJobs = [...jobsWithDescriptions, ...enrichedJobs];
    
    await scraper.saveToJson(finalJobs, 'ey_jobs.json');
    console.log(`✓ Saved ${finalJobs.length} jobs (${enrichedJobs.length} newly enriched)`);
}

if (require.main === module) {
    // Check command line args
    const args = process.argv.slice(2);
    if (args.includes('--enrich')) {
        enrichExisting().catch(console.error);
    } else {
        main().catch(console.error);
    }
}

module.exports = EYScraper;

