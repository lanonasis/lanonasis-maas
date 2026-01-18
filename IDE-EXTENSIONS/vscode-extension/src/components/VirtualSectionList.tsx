import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';

export interface VirtualItem {
  key: string;
  height: number;
  content: React.ReactNode;
}

interface VirtualSectionListProps {
  items: VirtualItem[];
  maxHeight?: number;
  overscan?: number;
  className?: string;
}

const getIndexForOffset = (offsets: number[], target: number) => {
  let low = 0;
  let high = offsets.length - 1;
  let result = 0;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] <= target) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
};

export const VirtualSectionList = ({
  items,
  maxHeight = 420,
  overscan = 6,
  className,
}: VirtualSectionListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(maxHeight);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setViewportHeight(element.clientHeight || maxHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [maxHeight]);

  const { offsets, totalHeight } = useMemo(() => {
    const nextOffsets: number[] = [];
    let running = 0;
    items.forEach((item) => {
      nextOffsets.push(running);
      running += item.height;
    });
    return { offsets: nextOffsets, totalHeight: running };
  }, [items]);

  const range = useMemo(() => {
    if (items.length === 0) {
      return { start: 0, end: -1 };
    }
    const startIndex = Math.max(0, getIndexForOffset(offsets, scrollTop) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      getIndexForOffset(offsets, scrollTop + viewportHeight) + overscan
    );
    return { start: startIndex, end: endIndex };
  }, [items.length, offsets, overscan, scrollTop, viewportHeight]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ maxHeight, overflowY: 'auto' }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {items.slice(range.start, range.end + 1).map((item, index) => {
          const itemIndex = range.start + index;
          return (
            <div
              key={item.key}
              style={{
                position: 'absolute',
                top: offsets[itemIndex],
                left: 0,
                right: 0,
              }}
            >
              {item.content}
            </div>
          );
        })}
      </div>
    </div>
  );
};
