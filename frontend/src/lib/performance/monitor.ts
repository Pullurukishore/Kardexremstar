'use client';

// Performance monitoring utilities for tracking Core Web Vitals
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
        this.metrics.set('LCP', lastEntry.startTime);
        console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);
    } catch (e) {
      console.warn('LCP observer not supported');
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.set('FID', entry.processingStart - entry.startTime);
          console.log(`FID: ${(entry.processingStart - entry.startTime).toFixed(2)}ms`);
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.push(fidObserver);
    } catch (e) {
      console.warn('FID observer not supported');
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.set('CLS', clsValue);
        console.log(`CLS: ${clsValue.toFixed(4)}`);
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(clsObserver);
    } catch (e) {
      console.warn('CLS observer not supported');
    }

    // Total Blocking Time (TBT) approximation
    try {
      const tbtObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        let tbt = 0;
        entries.forEach((entry: any) => {
          if (entry.duration > 50) {
            tbt += entry.duration - 50;
          }
        });
        this.metrics.set('TBT', tbt);
        console.log(`TBT (approx): ${tbt.toFixed(2)}ms`);
      });
      tbtObserver.observe({ type: 'longtask', buffered: true });
      this.observers.push(tbtObserver);
    } catch (e) {
      console.warn('TBT observer not supported');
    }
  }

  // Mark performance points
  mark(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(name);
    }
  }

  // Measure between marks
  measure(name: string, startMark?: string, endMark?: string): number {
    if (typeof window !== 'undefined' && 'performance' in window) {
      try {
        const measureName = `${name}-measure`;
        if (startMark && endMark) {
          performance.measure(measureName, startMark, endMark);
        } else if (startMark) {
          performance.measure(measureName, startMark);
        } else {
          // Measure from navigation start
          performance.measure(measureName);
        }
        
        const entries = performance.getEntriesByName(measureName);
        const duration = entries[entries.length - 1]?.duration || 0;
        
        // Clean up
        performance.clearMeasures(measureName);
        if (startMark) performance.clearMarks(startMark);
        if (endMark) performance.clearMarks(endMark);
        
        return duration;
      } catch (e) {
        console.warn('Performance measurement failed:', e);
        return 0;
      }
    }
    return 0;
  }

  // Get current metrics
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // Log performance summary
  logSummary(): void {
    const metrics = this.getMetrics();
    console.group('🚀 Performance Summary');
    
    Object.entries(metrics).forEach(([key, value]) => {
      let status = '✅';
      let threshold = '';
      
      switch (key) {
        case 'LCP':
          status = value <= 2500 ? '✅' : value <= 4000 ? '⚠️' : '❌';
          threshold = ' (Good: ≤2.5s, Needs Improvement: ≤4s)';
          break;
        case 'FID':
          status = value <= 100 ? '✅' : value <= 300 ? '⚠️' : '❌';
          threshold = ' (Good: ≤100ms, Needs Improvement: ≤300ms)';
          break;
        case 'CLS':
          status = value <= 0.1 ? '✅' : value <= 0.25 ? '⚠️' : '❌';
          threshold = ' (Good: ≤0.1, Needs Improvement: ≤0.25)';
          break;
        case 'TBT':
          status = value <= 200 ? '✅' : value <= 600 ? '⚠️' : '❌';
          threshold = ' (Good: ≤200ms, Needs Improvement: ≤600ms)';
          break;
      }
      
      console.log(`${status} ${key}: ${value.toFixed(2)}${key === 'CLS' ? '' : 'ms'}${threshold}`);
    });
    
    console.groupEnd();
  }

  // Clean up observers
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Utility functions for component-level performance tracking
export const trackComponentRender = (componentName: string) => {
  const monitor = PerformanceMonitor.getInstance();
  monitor.mark(`${componentName}-render-start`);
  
  return () => {
    const duration = monitor.measure(`${componentName}-render`, `${componentName}-render-start`);
    if (duration > 16) { // Warn if render takes longer than one frame (16ms)
      console.warn(`⚠️ Slow render detected: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  };
};

export const trackAsyncOperation = async <T>(
  operationName: string, 
  operation: () => Promise<T>
): Promise<T> => {
  const monitor = PerformanceMonitor.getInstance();
  monitor.mark(`${operationName}-start`);
  
  try {
    const result = await operation();
    const duration = monitor.measure(operationName, `${operationName}-start`);
    console.log(`📊 ${operationName}: ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    const duration = monitor.measure(`${operationName}-error`, `${operationName}-start`);
    console.error(`❌ ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
};

// Initialize performance monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const monitor = PerformanceMonitor.getInstance();
  
  // Log summary after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      monitor.logSummary();
    }, 2000);
  });
}
