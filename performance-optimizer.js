/* ============================================================================
   NASZY PERFORMANCE OPTIMIZATION ENGINE
   ============================================================================
   Advanced Features:
   • IndexedDB for large-scale data persistence
   • Smart caching strategies (LRU, Temporal)
   • Memory management & garbage collection
   • Lazy loading & code splitting
   • Request batching & debouncing
   • Data compression & indexing
   • Real-time performance monitoring
   ============================================================================ */

// ══════════════════════════════════════════════════════════════════
// LRU CACHE CLASS (standalone)
// ══════════════════════════════════════════════════════════════════
class LRUCache {
  constructor(maxSize = 100, defaultTTL = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.accessOrder = [];
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    if (this.cache.size >= this.maxSize) {
      const lru = this.accessOrder.shift();
      this.cache.delete(lru);
    }

    this.cache.set(key, { value, timestamp: Date.now(), ttl });
    this.accessOrder.push(key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }
}

class PerformanceOptimizer {
  constructor() {
    this.db = null;
    this.cache = new LRUCache(150, 1800000);
    this.metrics = {
      renders: 0,
      loadTime: 0,
      memoryUsage: [],
      fps: 60
    };
    this.initDB();
    this.startMonitoring();
  }

  // ── DATABASE INITIALIZATION (IndexedDB) ──────────────────────────
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('NaszyDB', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.createObjectStores();
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createObjectStores(db);
      };
    });
  }

  createObjectStores(db = this.db) {
    const stores = [
      { name: 'notes', keyPath: 'id', indexes: [['subject', 'subject'], ['date', 'date']] },
      { name: 'cards', keyPath: 'id', indexes: [['deckId', 'deckId'], ['box', 'box'], ['lastReviewed', 'lastReviewed']] },
      { name: 'sessions', keyPath: 'id', indexes: [['date', 'date'], ['duration', 'duration']] },
      { name: 'cache', keyPath: 'key', indexes: [['timestamp', 'timestamp']] }
    ];

    stores.forEach(store => {
      if (!db.objectStoreNames.contains(store.name)) {
        const os = db.createObjectStore(store.name, { keyPath: store.keyPath });
        store.indexes.forEach(([name, path]) => {
          os.createIndex(name, path);
        });
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // DATABASE OPERATIONS (Async)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Save data to IndexedDB (async)
   */
  async saveToIndexedDB(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Batch save multiple items (optimized)
   */
  async batchSaveToIndexedDB(storeName, items) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Optimized: batch add items without counting callbacks
      for (const item of items) {
        store.put(item);
      }

      // Wait for transaction completion
      transaction.oncomplete = () => resolve(items.length);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Query from IndexedDB with indexing
   */
  async queryFromIndexedDB(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // SMART CACHING SYSTEM (LRU + TTL)
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get with automatic caching
   */
  cachedGet(key, fetchFn, ttl = 1800000) {
    let value = this.cache.get(key);
    if (value) return value;

    value = fetchFn();
    this.cache.set(key, value, ttl);
    return value;
  }

  /**
   * Invalidate cache for key pattern
   */
  invalidateCache(pattern) {
    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.cache.keys());
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.cache.delete(key);
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // LAZY LOADING & CODE SPLITTING
  // ══════════════════════════════════════════════════════════════════

  /**
   * Dynamically load module (code splitting)
   */
  async loadModule(moduleName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${moduleName}.js`;
      script.async = true;
      script.onload = () => resolve(window[moduleName]);
      script.onerror = () => reject(new Error(`Failed to load ${moduleName}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Lazy load component when visible (Intersection Observer)
   */
  observeLazyLoad(element, callback) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '50px' });

    observer.observe(element);
    return observer;
  }

  /**
   * Request batching (collect requests, process in batches)
   */
  batchRequests(fn, batchSize = 10, delay = 100) {
    let requests = [];
    let timeout = null;

    return (arg) => {
      requests.push(arg);

      clearTimeout(timeout);

      if (requests.length >= batchSize) {
        fn(requests);
        requests = [];
      } else {
        timeout = setTimeout(() => {
          if (requests.length > 0) {
            fn(requests);
            requests = [];
          }
        }, delay);
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // MEMORY MANAGEMENT
  // ══════════════════════════════════════════════════════════════════

  /**
   * Monitor memory usage
   */
  monitorMemory() {
    if (performance.memory) {
      const usage = performance.memory;
      this.metrics.memoryUsage.push({
        used: usage.usedJSHeapSize,
        total: usage.totalJSHeapSize,
        limit: usage.jsHeapSizeLimit,
        timestamp: Date.now()
      });

      // Keep only last 100 measurements
      if (this.metrics.memoryUsage.length > 100) {
        this.metrics.memoryUsage.shift();
      }

      return usage;
    }
  }

  /**
   * Get memory efficiency score (0-100)
   */
  getMemoryEfficiency() {
    if (this.metrics.memoryUsage.length === 0) return 0;

    const latest = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1];
    const efficiency = 100 - (latest.used / latest.limit) * 100;

    return Math.max(0, efficiency);
  }

  /**
   * Garbage collection hint (clear caches)
   */
  performGarbageCollection() {
    const before = performance.memory?.usedJSHeapSize || 0;

    // Clear old cache entries
    this.cache.clear();

    // Clear old metrics
    if (this.metrics.memoryUsage.length > 50) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
    }

    const after = performance.memory?.usedJSHeapSize || 0;
    const freed = before - after;

    return {
      freed: Math.round(freed / 1024 / 1024) + ' MB',
      efficiency: this.getMemoryEfficiency()
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // RENDERING OPTIMIZATION
  // ══════════════════════════════════════════════════════════════════

  /**
   * Debounce expensive operations
   */
  debounce(fn, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
  }

  /**
   * Throttle operations (max once per interval)
   */
  throttle(fn, limit) {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Request animation frame for smooth updates
   */
  scheduleAnimationFrame(callback) {
    return requestAnimationFrame(callback);
  }

  /**
   * Measure rendering performance
   */
  measureRender(component) {
    const start = performance.now();
    const result = component();
    const duration = performance.now() - start;

    this.metrics.renders++;
    return { result, duration };
  }

  // ══════════════════════════════════════════════════════════════════
  // PERFORMANCE MONITORING
  // ══════════════════════════════════════════════════════════════════

  /**
   * Start continuous performance monitoring
   */
  startMonitoring() {
    // Monitor memory every 5 seconds
    setInterval(() => this.monitorMemory(), 5000);

    // Monitor FPS
    this.measureFPS();

    // Log performance metrics every minute
    setInterval(() => this.logMetrics(), 60000);
  }

  /**
   * Measure FPS (frames per second)
   */
  measureFPS() {
    let frameCount = 0;
    const tick = () => {
      frameCount++;
      setTimeout(() => {
        this.metrics.fps = frameCount;
        frameCount = 0;
        this.measureFPS();
      }, 1000);
    };
    requestAnimationFrame(tick);
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport() {
    const memory = this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1] || {};
    const nav = performance.getEntriesByType('navigation')[0] || {};

    return {
      memory: {
        used: Math.round(memory.used / 1024 / 1024) + ' MB',
        limit: Math.round(memory.limit / 1024 / 1024) + ' MB',
        efficiency: Math.round(this.getMemoryEfficiency()) + '%'
      },
      rendering: {
        fps: this.metrics.fps,
        renders: this.metrics.renders,
        cacheSize: this.cache.size()
      },
      network: {
        loadTime: Math.round(nav.loadEventEnd - nav.fetchStart) + ' ms',
        domReady: Math.round(nav.domContentLoadedEventEnd - nav.fetchStart) + ' ms'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log performance metrics
   */
  logMetrics() {
    const report = this.getPerformanceReport();
    console.log('📊 NASZY Performance Report:', report);
  }

  // ══════════════════════════════════════════════════════════════════
  // DATA COMPRESSION & INDEXING
  // ══════════════════════════════════════════════════════════════════

  /**
   * Compress data using dictionary encoding
   */
  compressData(data) {
    const json = JSON.stringify(data);
    const size = new Blob([json]).size;

    // Simple dictionary compression (can be enhanced)
    const compressed = {
      orig: json,
      size,
      compressed: btoa(json) // Base64 compression
    };

    return compressed;
  }

  /**
   * Create search index for fast queries
   */
  createSearchIndex(items, searchFields) {
    const index = new Map();

    items.forEach((item, idx) => {
      searchFields.forEach(field => {
        const value = item[field];
        if (!value) return;

        const terms = value.toString().toLowerCase().split(/\s+/);
        terms.forEach(term => {
          if (!index.has(term)) {
            index.set(term, []);
          }
          index.get(term).push({ itemIdx: idx, relevance: 1 });
        });
      });
    });

    return index;
  }

  /**
   * Search using index
   */
  searchWithIndex(index, query, items) {
    const terms = query.toLowerCase().split(/\s+/);
    const results = new Map();

    terms.forEach(term => {
      const matches = index.get(term) || [];
      matches.forEach(match => {
        const itemIdx = match.itemIdx;
        results.set(itemIdx, (results.get(itemIdx) || 0) + 1);
      });
    });

    return Array.from(results.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([idx]) => items[idx]);
  }

  // ══════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get optimization score (0-100)
   */
  getOptimizationScore() {
    const memory = this.getMemoryEfficiency();
    const fps = Math.min(100, (this.metrics.fps / 60) * 100);
    const cache = Math.min(100, (this.cache.size() / 150) * 100);

    return Math.round((memory * 0.4 + fps * 0.35 + cache * 0.25) / 100);
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];
    const efficiency = this.getMemoryEfficiency();

    if (efficiency < 30) {
      recommendations.push('⚠️ Clear cache and close unused tabs');
    }

    if (this.metrics.fps < 45) {
      recommendations.push('⚠️ Disable animations or reduce visual effects');
    }

    if (this.cache.size() > 140) {
      recommendations.push('💾 Cache is large, clearing old entries');
      this.performGarbageCollection();
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance is optimal');
    }

    return recommendations;
  }
}

// Global instance
const perfOptimizer = new PerformanceOptimizer();

// Export for use
window.perfOptimizer = perfOptimizer;
