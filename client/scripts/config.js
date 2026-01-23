// ============================================================================
// CONFIGURATION
// ============================================================================

// Navigation data for each role
export const navData = {
  seeker: [
    { name: 'Home', icon: 'bi-house-door', id: 'seeker-home' },
    { name: 'My Career', icon: 'bi-person-badge', id: 'seeker-profile' },
    { name: 'Career History', icon: 'bi-clock-history', id: 'seeker-career' },
    { name: 'Learning Paths', icon: 'bi-book', id: 'seeker-learning' },
    { name: 'Job Board', icon: 'bi-briefcase', id: 'seeker-jobs' }
  ],
  recruiter: [
    { name: 'Home', icon: 'bi-house-door', id: 'recruiter-home' },
    { name: 'Candidate Search', icon: 'bi-search', id: 'recruiter-search' },
    { name: 'Hiring Strategy', icon: 'bi-graph-up', id: 'recruiter-strategy' }
  ],
  auditor: [
    { name: 'Home', icon: 'bi-house-door', id: 'auditor-home' },
    { name: 'Audit Logs', icon: 'bi-journal-text', id: 'auditor-logs' },
    { name: 'Risk Matrix', icon: 'bi-grid-3x3', id: 'auditor-matrix' },
    { name: 'Compliance Reports', icon: 'bi-file-earmark-check', id: 'auditor-reports' }
  ]
};

// API base URL
export const API_BASE = 'http://localhost:3000/api';

// Mock data fallback when API is unavailable
export const mockCareerData = {
  employee: {
    id: 1,
    name: 'Alex Chen',
    title: 'Senior Software Engineer',
    department: 'Technology Consulting',
    startDate: '2021-03-15',
    yearsAtCompany: 4.8,
    email: 'alex.chen@ey.com',
    location: 'Dallas, TX'
  },
  projects: [
    { id: 1, name: 'Cloud Migration Initiative', role: 'Tech Lead', status: 'Completed', startDate: '2024-01-15', endDate: '2024-08-30', client: 'Fortune 500 Bank', rating: 4.8, description: 'Led a team of 8 engineers to migrate legacy systems to AWS' },
    { id: 2, name: 'AI-Powered Analytics Platform', role: 'Senior Developer', status: 'Completed', startDate: '2023-06-01', endDate: '2023-12-15', client: 'Healthcare Provider', rating: 4.9, description: 'Developed ML pipelines for predictive patient care analytics' },
    { id: 3, name: 'Digital Transformation Roadmap', role: 'Consultant', status: 'Completed', startDate: '2022-09-01', endDate: '2023-05-30', client: 'Retail Chain', rating: 4.5, description: 'Created technology strategy and implementation plan' },
    { id: 4, name: 'Cybersecurity Assessment', role: 'Developer', status: 'Completed', startDate: '2021-06-15', endDate: '2022-08-30', client: 'Insurance Company', rating: 4.7, description: 'Built security monitoring dashboards and automated threat detection' }
  ],
  feedback: [
    { id: 1, date: '2024-12-01', reviewer: 'Sarah Mitchell (Partner)', type: 'Annual Review', rating: 5, summary: 'Exceptional performance. Ready for promotion to Manager track.', strengths: ['Technical leadership', 'Client communication', 'Team mentorship'], improvements: ['Delegation', 'Strategic thinking'] },
    { id: 2, date: '2024-06-15', reviewer: 'James Park (Manager)', type: 'Mid-Year Check-in', rating: 4, summary: 'Strong delivery on Cloud Migration project. Exceeded client expectations.', strengths: ['Problem solving', 'Technical depth', 'Deadline management'], improvements: ['Documentation'] },
    { id: 3, date: '2023-12-01', reviewer: 'Sarah Mitchell (Partner)', type: 'Annual Review', rating: 4, summary: 'Solid year with consistent high-quality deliverables.', strengths: ['Code quality', 'Reliability', 'Learning agility'], improvements: ['Public speaking', 'Networking'] }
  ],
  skills: [
    { name: 'JavaScript/TypeScript', level: 95, verified: true, category: 'Programming' },
    { name: 'React', level: 90, verified: true, category: 'Frontend' },
    { name: 'Node.js', level: 85, verified: true, category: 'Backend' },
    { name: 'Python', level: 80, verified: true, category: 'Programming' },
    { name: 'AWS', level: 75, verified: true, category: 'Cloud' },
    { name: 'SQL/PostgreSQL', level: 80, verified: false, category: 'Database' },
    { name: 'Docker/Kubernetes', level: 70, verified: false, category: 'DevOps' },
    { name: 'Machine Learning', level: 60, verified: false, category: 'AI/ML' },
    { name: 'System Design', level: 75, verified: false, category: 'Architecture' },
    { name: 'Agile/Scrum', level: 85, verified: true, category: 'Methodology' }
  ],
  recommendations: [
    { id: 1, title: 'Manager - Technology Consulting', department: 'Consulting', location: 'Dallas, TX', fitScore: 96, salary: '$140k-180k', reason: 'Natural progression based on performance and leadership skills' },
    { id: 2, title: 'Senior Manager - AI & Data', department: 'Technology', location: 'Austin, TX', fitScore: 89, salary: '$160k-200k', reason: 'Strong ML skills and recent AI project experience' },
    { id: 3, title: 'Director - Cloud Architecture', department: 'Technology', location: 'Remote', fitScore: 85, salary: '$180k-220k', reason: 'AWS expertise and cloud migration leadership' }
  ],
  publicProfile: {
    spotlightLabel: 'Spotlight',
    status: { label: 'Out of Office', backOn: 'Jan 28, 2026' },
    bio: 'I enjoy meeting new people and finding ways to help them have an uplifting experience. I am passionate, love arts and enjoy spending time with ...',
    contact: {
      phone: '(1) 416 6172297',
      email: 'alex.chen@ey.com',
      location: 'Dallas, TX'
    },
    manager: { name: 'Jerry Choate', title: 'Head of R&D' },
    org: {
      company: 'BestRun (10000)',
      businessUnit: 'Products (PRODS)',
      division: 'Research & Development (RES_DEV)',
      department: 'Technology Consulting'
    },
    absence: { range: 'January 25 – 27', label: 'Out of Office' },
    skillHighlights: {
      left: { label: 'Problem Solving', score: 4 },
      right: { label: 'Business Processes', score: 4 }
    },
    competencies: [
      { label: 'Attentive Listening', value: 5 },
      { label: 'Inspiring and Motivating Others', value: 4 },
      { label: 'Building and Supporting Teams', value: 4 },
      { label: 'Critical Thinking', value: 3 },
      { label: 'Displaying Technical Expertise', value: 3 }
    ],
    reportingLine: [
      { name: 'Linda R. Simpson', title: 'CEO' },
      { name: 'Janelle Boring', title: 'VP Products' },
      { name: 'Jerry Choate', title: 'Head of R&D' }
    ],
    targetRoles: ['CHRO', 'Director of Marketing', 'VP Marketing'],
    tags: ['Leadership', 'People Ops', 'Coaching', 'Culture']
  }
};

