import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface StreamingTextProps {
  text: string;
  speed?: 'fast' | 'normal' | 'slow';
  delay?: number;
  showCursor?: boolean;
  cursorClassName?: string;
  className?: string;
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'pre';
  allowSkip?: boolean;
  onComplete?: () => void;
  /**
   * If provided, will only stream once per session key.
   */
  sessionKey?: string;
}

export function calculateStreamingStep(total: number, speed: 'fast' | 'normal' | 'slow' = 'normal'): number {
  if (speed === 'fast') {
    if (total > 1500) return Math.ceil(total / 60);
    if (total > 600) return Math.ceil(total / 45);
    if (total > 300) return 8;
    if (total > 100) return 4;
    return 2;
  }
  if (speed === 'slow') {
    if (total > 1000) return Math.ceil(total / 80);
    if (total > 300) return 3;
    if (total > 100) return 2;
    return 1;
  }
  if (total > 1500) return Math.ceil(total / 70);
  if (total > 600) return Math.ceil(total / 50);
  if (total > 350) return 6;
  if (total > 150) return 3;
  if (total > 50) return 2;
  return 1;
}

// Global in-memory cache to prevent re-streaming same text repeatedly if requested
const STREAMED_KEYS = new Set<string>();

export function StreamingText({
  text,
  speed = 'normal',
  delay = 0,
  showCursor = true,
  cursorClassName = 'w-1.5 h-3.5 bg-zinc-900',
  className = '',
  as: Component = 'span',
  allowSkip = true,
  onComplete,
  sessionKey,
}: StreamingTextProps) {
  // If sessionKey was already streamed, show immediately
  const alreadyStreamed = sessionKey ? STREAMED_KEYS.has(sessionKey) : false;

  const tokens = useMemo(() => {
    if (!text) return [];
    return text.split(/(\s+)/);
  }, [text]);

  const [displayedCount, setDisplayedCount] = useState<number>(() =>
    alreadyStreamed ? tokens.length : 0
  );
  const [isCompleted, setIsCompleted] = useState<boolean>(alreadyStreamed);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (alreadyStreamed) {
      setDisplayedCount(tokens.length);
      setIsCompleted(true);
      return;
    }

    setDisplayedCount(0);
    setIsCompleted(false);

    const total = tokens.length;
    if (total === 0) {
      setIsCompleted(true);
      if (sessionKey) STREAMED_KEYS.add(sessionKey);
      onComplete?.();
      return;
    }

    const step = calculateStreamingStep(total, speed);
    const baseInterval = speed === 'fast' ? 12 : speed === 'slow' ? 26 : 18;

    let currentIndex = 0;

    const startStreaming = () => {
      timerRef.current = setInterval(() => {
        currentIndex = Math.min(currentIndex + step, total);
        setDisplayedCount(currentIndex);

        if (currentIndex >= total) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsCompleted(true);
          if (sessionKey) STREAMED_KEYS.add(sessionKey);
          onComplete?.();
        }
      }, baseInterval);
    };

    let delayTimer: NodeJS.Timeout | null = null;
    if (delay > 0) {
      delayTimer = setTimeout(startStreaming, delay);
    } else {
      startStreaming();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (delayTimer) clearTimeout(delayTimer);
    };
  }, [text, speed, delay, tokens, alreadyStreamed, sessionKey, onComplete]);

  const handleSkip = () => {
    if (!allowSkip || isCompleted) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setDisplayedCount(tokens.length);
    setIsCompleted(true);
    if (sessionKey) STREAMED_KEYS.add(sessionKey);
    onComplete?.();
  };

  const visibleText = useMemo(() => {
    if (isCompleted || displayedCount >= tokens.length) {
      return text;
    }
    return tokens.slice(0, displayedCount).join('');
  }, [tokens, displayedCount, isCompleted, text]);

  return (
    <Component
      onClick={handleSkip}
      className={`${className} ${!isCompleted && allowSkip ? 'cursor-pointer select-none' : ''}`}
      title={!isCompleted && allowSkip ? 'Click to show full text' : undefined}
    >
      <span>{visibleText}</span>
      {!isCompleted && showCursor && (
        <span
          className={`inline-block ml-0.5 rounded-2xs align-middle animate-cursor ${cursorClassName}`}
          aria-hidden="true"
        />
      )}
    </Component>
  );
}
