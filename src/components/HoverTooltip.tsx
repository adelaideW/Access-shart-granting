/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Portal } from './Portal.tsx';

export type HoverTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';
export type HoverTooltipAlign = 'start' | 'center' | 'end';

export type HoverTooltipProps = {
  content: React.ReactNode;
  placement?: HoverTooltipPlacement;
  align?: HoverTooltipAlign;
  delay?: number;
  /** Extra classes on the tooltip panel */
  className?: string;
  /** Classes on the trigger wrapper */
  wrapperClassName?: string;
  children: React.ReactNode;
};

export function HoverTooltip({
  content,
  placement = 'top',
  align = 'center',
  delay = 80,
  className = '',
  wrapperClassName = '',
  children,
}: HoverTooltipProps) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    opacity: 0,
    zIndex: 3000,
  });

  const clearOpenTimer = () => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleOpen = () => {
    clearCloseTimer();
    clearOpenTimer();
    openTimer.current = setTimeout(() => setOpen(true), delay);
  };

  const scheduleClose = () => {
    clearOpenTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 50);
  };

  const getWrapRect = () => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const r = wrap.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return r;
    const first = wrap.firstElementChild as HTMLElement | null;
    if (first) return first.getBoundingClientRect();
    return r;
  };

  const updatePosition = useCallback(() => {
    const tip = tipRef.current;
    if (!tip || !open) return;

    const rect = getWrapRect();
    if (!rect) return;
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const offset = 8;

    let top = 0;
    let left = 0;

    if (placement === 'top') {
      top = rect.top - th - offset;
      if (align === 'start') left = rect.left;
      else if (align === 'end') left = rect.right - tw;
      else left = rect.left + rect.width / 2 - tw / 2;
    } else if (placement === 'bottom') {
      top = rect.bottom + offset;
      if (align === 'start') left = rect.left;
      else if (align === 'end') left = rect.right - tw;
      else left = rect.left + rect.width / 2 - tw / 2;
    } else if (placement === 'left') {
      left = rect.left - tw - offset;
      top = rect.top + rect.height / 2 - th / 2;
    } else {
      left = rect.right + offset;
      top = rect.top + rect.height / 2 - th / 2;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - th - 8));

    setStyle({
      position: 'fixed',
      top,
      left,
      zIndex: 3000,
      opacity: 1,
    });
  }, [open, placement, align]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition, content]);

  useLayoutEffect(() => {
    if (!open) return;
    const tip = tipRef.current;
    if (!tip) return;
    const ro = new ResizeObserver(() => updatePosition());
    ro.observe(tip);
    return () => ro.disconnect();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (e: Event) => {
      const target = e.target as Node | null;
      const wrap = wrapRef.current;
      const tip = tipRef.current;
      if (tip && target && tip.contains(target)) return;
      if (wrap && target && wrap.contains(target)) return;
      updatePosition();
    };
    const onResize = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    return () => {
      clearOpenTimer();
      clearCloseTimer();
    };
  }, []);

  return (
    <>
      <span
        ref={wrapRef}
        className={wrapperClassName}
        style={wrapperClassName ? undefined : { display: 'contents' }}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onFocus={scheduleOpen}
        onBlur={scheduleClose}
      >
        {children}
      </span>
      {open && (
        <Portal>
          <div
            ref={tipRef}
            style={style}
            className={className}
            onMouseEnter={() => {
              clearCloseTimer();
            }}
            onMouseLeave={scheduleClose}
          >
            {content}
          </div>
        </Portal>
      )}
    </>
  );
}
