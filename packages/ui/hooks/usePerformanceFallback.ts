import { useState, useEffect } from 'react';

/**
 * Detects if the device is low-end or if the frame load is > 16ms
 * Returns true if we should use a low-performance fallback (e.g., disable glassmorphism).
 */
export function usePerformanceFallback() {
  const [isLowPerformance, setIsLowPerformance] = useState(false);

  useEffect(() => {
    // Basic heuristic: hardware concurrency or device memory
    const hardwareConcurrency = (navigator as any).hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4;

    if (hardwareConcurrency <= 4 || deviceMemory <= 4) {
      setIsLowPerformance(true);
      return;
    }

    // Advanced heuristic: frame time
    let lastTime = performance.now();
    let frameCount = 0;
    let slowFrames = 0;
    
    const measureFrame = () => {
      const now = performance.now();
      const delta = now - lastTime;
      
      if (delta > 16.6) { // More than 16.6ms (under 60fps)
        slowFrames++;
      }
      
      frameCount++;
      lastTime = now;

      // After 60 frames (approx 1s), check if we have too many slow frames
      if (frameCount < 60) {
        requestAnimationFrame(measureFrame);
      } else {
        if (slowFrames > 15) { // 25% of frames were slow
          setIsLowPerformance(true);
        }
      }
    };

    requestAnimationFrame(measureFrame);
  }, []);

  return isLowPerformance;
}
