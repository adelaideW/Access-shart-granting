/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// jsdom does not implement ResizeObserver (used by PortalMenu / HoverTooltip positioning)
(globalThis as unknown as { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
  ResizeObserverMock as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
});
