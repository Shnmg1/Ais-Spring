// ============================================================================
// ANIMATION UTILITIES
// ============================================================================

export class CountUp {
  constructor(element, endValue, duration = 2) {
    this.element = element;
    this.startValue = 0;
    this.endValue = endValue;
    this.duration = duration * 1000;
    this.startTime = null;
    this.frameRequest = null;
    
    // Intersection Observer to start when visible
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.start();
        this.observer.disconnect();
      }
    }, { threshold: 0.1 });
    
    if (this.element) {
      this.observer.observe(this.element);
    }
  }

  // Quintic ease out - smooth deceleration to mimic spring
  easeOutQuint(x) {
    return 1 - Math.pow(1 - x, 5);
  }

  animate(currentTime) {
    if (!this.startTime) this.startTime = currentTime;
    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    
    const ease = this.easeOutQuint(progress);
    const current = Math.floor(this.startValue + (this.endValue - this.startValue) * ease);
    
    this.element.textContent = new Intl.NumberFormat('en-US').format(current);

    if (progress < 1) {
      this.frameRequest = requestAnimationFrame(this.animate.bind(this));
    } else {
      this.element.textContent = new Intl.NumberFormat('en-US').format(this.endValue);
    }
  }

  start() {
    this.frameRequest = requestAnimationFrame(this.animate.bind(this));
  }
}

