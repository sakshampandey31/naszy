/* ============================================================================
   NASZY PERFORMANCE OPTIMIZATIONS
   ============================================================================
   Advanced optimizations for:
   • Event delegation & debouncing
   • DOM batching & virtual updates
   • Memory leak prevention
   • Smooth scroll with RAF throttling
   • Canvas FPS optimization
   ============================================================================ */

// ── EVENT DEBOUNCE & THROTTLE UTILITIES ────────────────────────────────────
const OptUtils = (() => {
  let debounceTimers = new Map();
  let throttleStates = new Map();

  return {
    // Debounce: Wait until user stops doing something
    debounce(key, fn, timeout = 300) {
      if (debounceTimers.has(key)) {
        clearTimeout(debounceTimers.get(key));
      }
      const timer = setTimeout(fn, timeout);
      debounceTimers.set(key, timer);
    },

    // Throttle: Execute at most once per interval
    throttle(key, fn, limit = 100) {
      if (throttleStates.has(key)) {
        const state = throttleStates.get(key);
        if (!state.active) {
          state.pending = true;
          return;
        }
        return;
      }

      throttleStates.set(key, { active: true, pending: false });
      fn();

      setTimeout(() => {
        const state = throttleStates.get(key);
        if (state?.pending) {
          state.pending = false;
          fn();
        } else {
          throttleStates.delete(key);
        }
      }, limit);
    },

    // Batch DOM updates using requestAnimationFrame
    batch(updates) {
      requestAnimationFrame(() => {
        updates.forEach(update => update());
      });
    },

    // Cleanup utilities
    cleanup(key, type = 'debounce') {
      if (type === 'debounce' && debounceTimers.has(key)) {
        clearTimeout(debounceTimers.get(key));
        debounceTimers.delete(key);
      } else if (type === 'throttle') {
        throttleStates.delete(key);
      }
    },

    cleanupAll() {
      debounceTimers.forEach(timer => clearTimeout(timer));
      debounceTimers.clear();
      throttleStates.clear();
    }
  };
})();

// ── SCROLL OPTIMIZATION ────────────────────────────────────────────────────
class ScrollOptimizer {
  constructor(element, callback, threshold = 0.85) {
    this.element = element;
    this.callback = callback;
    this.threshold = threshold;
    this.isThrottled = false;
    this.observerActive = true;

    // Use passive event listener for better scroll performance
    this.element?.addEventListener('scroll', this.handleScroll.bind(this), { 
      passive: true 
    });
  }

  handleScroll() {
    if (this.isThrottled) return;
    this.isThrottled = true;

    requestAnimationFrame(() => {
      const scrollTop = this.element.scrollTop;
      const scrollHeight = this.element.scrollHeight;
      const clientHeight = this.element.clientHeight;
      const scrollPercent = (scrollTop + clientHeight) / scrollHeight;

      if (scrollPercent > this.threshold) {
        this.callback();
      }
      this.isThrottled = false;
    });
  }

  destroy() {
    this.observerActive = false;
    this.element?.removeEventListener('scroll', this.handleScroll);
  }
}

// ── CANVAS ANIMATION OPTIMIZER ────────────────────────────────────────────
class CanvasAnimationOptimizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: false });
    this.animationId = null;
    this.lastFrameTime = 0;
    this.targetFPS = 60;
    this.frameTime = 1000 / this.targetFPS;
    this.isRunning = false;
    this.particles = [];
  }

  // Only animate when canvas is visible
  startAnimation(particleGenerator, frameCallback) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.particles = particleGenerator();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          this.pauseAnimation();
        } else if (!this.isRunning) {
          this.resumeAnimation();
        }
      });
    });

    observer.observe(this.canvas);

    this.animate(frameCallback);
  }

  animate(frameCallback) {
    const now = performance.now();
    const delta = now - this.lastFrameTime;

    // Only update if enough time has passed
    if (delta >= this.frameTime) {
      frameCallback(this.ctx, this.particles, this.canvas);
      this.lastFrameTime = now;
    }

    if (this.isRunning) {
      this.animationId = requestAnimationFrame(() => this.animate(frameCallback));
    }
  }

  pauseAnimation() {
    this.isRunning = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  resumeAnimation() {
    this.isRunning = true;
    this.lastFrameTime = 0;
    this.animate.bind(this);
  }

  destroy() {
    this.pauseAnimation();
  }
}

// ── DOM UPDATE BATCH MANAGER ──────────────────────────────────────────────
class DOMBatchUpdater {
  constructor(batchSize = 50) {
    this.queue = [];
    this.batchSize = batchSize;
    this.isProcessing = false;
  }

  add(updateFn) {
    this.queue.push(updateFn);
    if (!this.isProcessing && this.queue.length >= this.batchSize) {
      this.flush();
    }
  }

  flush() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    requestAnimationFrame(() => {
      const batch = this.queue.splice(0, this.batchSize);
      batch.forEach(fn => fn());
      this.isProcessing = false;

      if (this.queue.length > 0) {
        this.flush();
      }
    });
  }

  clear() {
    this.queue = [];
  }
}

// ── MEMORY MONITOR ────────────────────────────────────────────────────────
class MemoryMonitor {
  constructor() {
    this.samples = [];
    this.maxSamples = 60; // 1 minute of data at 1Hz
    this.warningThreshold = 0.85; // 85% of available
    this.criticalThreshold = 0.95; // 95% critical
    this.callbacks = [];
  }

  addWarningCallback(fn) {
    this.callbacks.push(fn);
  }

  sample() {
    if (performance.memory) {
      const usage = performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
      this.samples.push(usage);
      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }

      if (usage > this.criticalThreshold) {
        this.triggerWarning('critical', usage);
      } else if (usage > this.warningThreshold) {
        this.triggerWarning('warning', usage);
      }
    }
  }

  triggerWarning(level, usage) {
    this.callbacks.forEach(cb => cb(level, usage));
  }

  getAverageUsage() {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  clear() {
    this.samples = [];
  }
}

// ── LAZY LOAD MANAGER ──────────────────────────────────────────────────────
class LazyLoadManager {
  constructor() {
    this.observer = null;
    this.targets = new Set();
  }

  init() {
    if (!this.observer) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadElement(entry.target);
            this.observer.unobserve(entry.target);
            this.targets.delete(entry.target);
          }
        });
      }, { rootMargin: '50px' });
    }
  }

  observe(element) {
    this.init();
    this.observer.observe(element);
    this.targets.add(element);
  }

  loadElement(el) {
    if (el.dataset.src) {
      el.src = el.dataset.src;
      delete el.dataset.src;
    }
    if (el.dataset.background) {
      el.style.backgroundImage = `url(${el.dataset.background})`;
      delete el.dataset.background;
    }
  }

  observeAll(selector) {
    document.querySelectorAll(selector).forEach(el => this.observe(el));
  }

  destroy() {
    this.observer?.disconnect();
    this.targets.clear();
  }
}

// ── AUTO-SAVE DEBOUNCER (prevents multiple saves) ──────────────────────────
class AutoSaveManager {
  constructor(saveFunction, timeout = 1000) {
    this.saveFunction = saveFunction;
    this.timeout = timeout;
    this.timer = null;
    this.pendingUpdate = false;
  }

  markDirty() {
    this.pendingUpdate = true;
    this.debounce();
  }

  debounce() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.pendingUpdate) {
        this.saveFunction();
        this.pendingUpdate = false;
      }
      this.timer = null;
    }, this.timeout);
  }

  forceSave() {
    if (this.timer) clearTimeout(this.timer);
    if (this.pendingUpdate) {
      this.saveFunction();
      this.pendingUpdate = false;
    }
  }

  cancel() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

// ── INITIALIZATION ─────────────────────────────────────────────────────────
const optimizationSuite = {
  utils: OptUtils,
  ScrollOptimizer,
  CanvasAnimationOptimizer,
  DOMBatchUpdater,
  MemoryMonitor,
  LazyLoadManager,
  AutoSaveManager
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = optimizationSuite;
}
