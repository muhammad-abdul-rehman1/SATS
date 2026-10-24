import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/**
 * Wrap expo-router's useRouter with guards so navigation calls don't throw
 * in edge cases (e.g. during fast refresh or unmounted states).
 */
export function useSafeRouter() {
  let r: any;
  try {
    r = useRouter();
  } catch (e) {
    // In edge cases (outside router tree) useRouter can throw.
    if (__DEV__) console.warn('[nav] useRouter threw – falling back to no-op router');
  }

  const noop = (..._args: any[]) => { /* no-op */ };

  // Ensure we always have callable functions
  const base = {
    push: r?.push || noop,
    replace: r?.replace || noop,
    back: r?.back || noop,
    canGoBack: r?.canGoBack ? () => { try { return r.canGoBack(); } catch { return true; } } : () => true,
    original: r || {},
  } as const;

  const safe = useCallback(<T extends any[]>(fn: (...args: T) => void) => {
    return (...args: T) => {
      try { fn(...args); } catch (e) { if (__DEV__) console.warn('[nav]', e); }
    };
  }, []);

  return {
    push: safe(base.push),
    replace: safe(base.replace),
    back: safe(base.back),
    canGoBack: base.canGoBack,
    original: base.original,
  };
}
