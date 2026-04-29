/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Portal } from './Portal.tsx';

export type PortalMenuPlacement = 'bottom' | 'top';

export type PortalMenuAlign = 'start' | 'end' | 'center';

export type PortalMenuProps = {
  open: boolean;
  /** Prefer this when the trigger is stable */
  triggerRef?: React.RefObject<HTMLElement | null>;
  /** Use for per-row menus where a single ref is awkward */
  getTriggerElement?: () => HTMLElement | null;
  placement?: PortalMenuPlacement;
  align?: PortalMenuAlign;
  /** Use trigger width (px) or a fixed width in px */
  width?: 'trigger' | number;
  offset?: number;
  /** Extra horizontal offset (px), e.g. align with `left-4` inside a cell */
  nudgeX?: number;
  className?: string;
  children: React.ReactNode;
  onRequestClose?: () => void;
  menuRef?: React.RefObject<HTMLDivElement | null>;
  id?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>;

function assignRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (!ref) return;
  if (typeof ref === 'function') {
    ref(value);
  } else {
    (ref as React.MutableRefObject<T | null>).current = value;
  }
}

export function PortalMenu({
  open,
  triggerRef,
  getTriggerElement,
  placement = 'bottom',
  align = 'start',
  width = 'trigger',
  offset = 8,
  nudgeX = 0,
  className = '',
  children,
  onRequestClose,
  menuRef,
  id,
  ...rest
}: PortalMenuProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [motionStyle, setMotionStyle] = useState<React.CSSProperties>({
    position: 'fixed',
    opacity: 0,
    zIndex: 3000,
  });

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      innerRef.current = el;
      assignRef(menuRef, el);
    },
    [menuRef]
  );

  const resolveTrigger = useCallback(() => {
    if (getTriggerElement) return getTriggerElement();
    return triggerRef?.current ?? null;
  }, [getTriggerElement, triggerRef]);

  const updatePosition = useCallback(() => {
    const el = resolveTrigger();
    if (!el || !open) return;

    const rect = el.getBoundingClientRect();
    let menuWidth = width === 'trigger' ? rect.width : width;
    menuWidth = Math.max(menuWidth, 1);

    let left = rect.left;
    if (align === 'end') {
      left = rect.right - menuWidth;
    } else if (align === 'center') {
      left = rect.left + rect.width / 2 - menuWidth / 2;
    }

    left += nudgeX;
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));

    let top: number;
    if (placement === 'bottom') {
      top = rect.bottom + offset;
    } else {
      const h = innerRef.current?.offsetHeight ?? 280;
      top = rect.top - offset - h;
      top = Math.max(8, top);
    }

    setMotionStyle({
      position: 'fixed',
      top,
      left,
      width: width === 'trigger' ? rect.width : menuWidth,
      zIndex: 3000,
      opacity: 1,
    });
  }, [open, resolveTrigger, placement, align, width, offset, nudgeX]);

  useLayoutEffect(() => {
    if (!open) return;
    if (!resolveTrigger()) {
      requestAnimationFrame(() => updatePosition());
      return;
    }
    updatePosition();
  }, [open, updatePosition, resolveTrigger]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updatePosition());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const close = () => onRequestClose?.();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onRequestClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={setRefs}
            id={id}
            style={motionStyle}
            initial={{ opacity: 0, y: placement === 'bottom' ? 8 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: placement === 'bottom' ? 8 : -8 }}
            transition={{ duration: 0.12 }}
            className={className}
            {...rest}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
