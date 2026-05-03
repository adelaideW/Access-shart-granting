import { useMemo } from 'react';

const INITIAL_SEARCH = typeof window !== 'undefined' ? window.location.search : '';

function isAllowedPortfolioReturn(u: URL): boolean {
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  if (u.username || u.password) return false;
  if (u.protocol === 'http:') {
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  }
  const h = u.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return true;
  if (h.endsWith('.vercel.app')) return true;
  return false;
}

function parsePortfolioReturn(search: string): string | null {
  let raw: string | null;
  try {
    raw = new URLSearchParams(search).get('portfolioReturn');
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    raw = decodeURIComponent(raw.trim());
  } catch {
    return null;
  }
  try {
    const u = new URL(raw);
    if (!isAllowedPortfolioReturn(u)) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function PortfolioReturnLink() {
  const href = useMemo(() => parsePortfolioReturn(INITIAL_SEARCH), []);
  if (!href) return null;
  return (
    <a
      href={href}
      className="fixed left-1/2 top-4 z-[10000] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-gray-200/90 bg-white/95 px-3 py-2 text-center text-sm font-medium text-gray-900 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A0039] focus-visible:ring-offset-2"
    >
      Back to portfolio home page
    </a>
  );
}
