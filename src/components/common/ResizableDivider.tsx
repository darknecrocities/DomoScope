import React, { useEffect, useRef } from 'react';

interface ResizableDividerProps {
  onResize: (deltaX: number) => void;
  direction?: 'horizontal' | 'vertical';
}

export function ResizableDivider({ onResize, direction = 'horizontal' }: ResizableDividerProps) {
  const isDragging = useRef(false);
  const startPos = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize, direction]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`group shrink-0 relative transition-colors ${
        direction === 'horizontal'
          ? 'w-1.5 cursor-col-resize hover:bg-zinc-300 active:bg-zinc-900 h-full'
          : 'h-1.5 cursor-row-resize hover:bg-zinc-300 active:bg-zinc-900 w-full'
      } bg-transparent`}
      title="Drag to resize panel"
    >
      <div
        className={`absolute inset-0 m-auto ${
          direction === 'horizontal' ? 'w-0.5 h-6' : 'h-0.5 w-6'
        } bg-zinc-300 rounded group-hover:bg-zinc-500 transition-colors`}
      />
    </div>
  );
}
