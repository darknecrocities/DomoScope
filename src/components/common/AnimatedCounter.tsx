import React, { useState, useEffect, useRef } from 'react';

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  delay?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 800,
  delay = 0,
  formatter = (v) => Math.round(v).toLocaleString(),
  className = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState<number>(() => (value === 0 ? 0 : 0));
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      prevValueRef.current = 0;
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = performance.now() + delay;
    let animationFrameId: number;

    const animate = (currentTime: number) => {
      if (currentTime < startTime) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration, delay]);

  return <span className={className}>{formatter(displayValue)}</span>;
}
