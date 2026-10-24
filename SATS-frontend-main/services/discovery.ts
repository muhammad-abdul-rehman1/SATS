import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration ──────────────────────────────────────────────────────────
export const API_PORT = 4000;
export const API_PATH = '/api';
export const API_SCHEME = 'http';

const LAST_GOOD_KEY = 'lastGoodApiUrl';

// Timeouts / tuning (kept small so discovery completes in a few seconds)
const FAST_PROBE_TIMEOUT_MS = 1200;
const SCAN_PROBE_TIMEOUT_MS = 800;
const SCAN_CONCURRENCY = 48;

// @ts-ignore – injected by Metro at bundle time
const EXPLICIT_ENV_URL = process.env.EXPO_PUBLIC_API_URL as string | undefined;

export function stripTrailingSlash(u: string): string {
  return u.replace(/\/+$/, '');
}

/** Normalise any host/IP/url into a full `http://host:4000/api` base URL. */
export function toBaseUrl(input: string): string {
  const host = String(input)
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .trim();
  return `${API_SCHEME}://${host}:${API_PORT}${API_PATH}`;
}

function isIpv4(s?: string | null): s is string {
  return !!s && /^\d{1,3}(\.\d{1,3}){3}$/.test(s);
}

export function isPrivateUrl(url: string): boolean {
  return (
    url.includes('192.168.') ||
    url.includes('10.') ||
    url.includes('172.') ||
    url.includes('127.0.0.1') ||
    url.includes('localhost')
  );
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '10.0.2.2';
}

/** Host alias an emulator uses to reach the dev machine. Meaningless on real hardware. */
function emulatorAlias(): string | null {
  if (Platform.OS === 'android') return '10.0.2.2';
  if (Platform.OS === 'ios') return '127.0.0.1';
  return null;
}

/**
 * Resolve the dev machine's IP from Expo's own bundle/manifest URLs.
 * Returns null in standalone builds, where nothing points back at the PC.
 */
export function metroHost(): string | null {
  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
    if (typeof scriptURL === 'string') {
      const m = scriptURL.match(/^https?:\/\/([^:/]+)/);
      if (m) {
        if (isLoopbackHost(m[1])) return emulatorAlias();
        if (isIpv4(m[1])) return m[1];
      }
    }

    const candidates: (string | undefined)[] = [
      (Constants as any)?.expoConfig?.hostUri,
      (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
      (Constants as any)?.expoGoConfig?.debuggerHost,
      (Constants as any)?.manifest?.debuggerHost,
      (Constants as any)?.manifest?.hostUri,
    ];
    for (const item of candidates) {
      if (typeof item === 'string') {
        const host = item.split(':')[0];
        if (isLoopbackHost(host)) return emulatorAlias();
        if (isIpv4(host)) return host;
      }
    }

    const urls: (string | undefined)[] = [
      (Constants as any)?.experienceUrl,
      (Constants as any)?.linkingUri,
    ];
    for (const u of urls) {
      if (typeof u === 'string') {
        const m = u.match(/(?:\w+:\/\/)?(\d{1,3}(?:\.\d{1,3}){3})/);
        if (m && m[1] && !isLoopbackHost(m[1])) return m[1];
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/** The phone's own IPv4 address on the current Wi-Fi network (null if unknown). */
export async function deviceIp(): Promise<string | null> {
  try {
    const ip = await (Network as any).getIpAddressAsync();
    if (isIpv4(ip) && ip !== '127.0.0.1' && !ip.startsWith('169.254.')) return ip;
  } catch {
    // expo-network may be unavailable – ignore
  }
  return null;
}

// ─── Persisted last-known-good URL ───────────────────────────────────────────
export async function getLastGoodBase(): Promise<string | null> {
  try {
    const v = await AsyncStorage.getItem(LAST_GOOD_KEY);
    return v && v.trim() ? stripTrailingSlash(v.trim()) : null;
  } catch {
    return null;
  }
}

export async function setLastGoodBase(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_GOOD_KEY, stripTrailingSlash(url));
  } catch {
    // ignore
  }
}

export async function clearLastGoodBase(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_GOOD_KEY);
  } catch {
    // ignore
  }
}

// ─── Health probing ──────────────────────────────────────────────────────────
export async function probeHealth(baseUrl: string, timeoutMs = FAST_PROBE_TIMEOUT_MS): Promise<boolean> {
  const url = `${stripTrailingSlash(baseUrl)}/auth/health`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
    });
    if (!res.ok) return false;
    const data = await res.json().catch(() => null);
    return !!data && String(data.status ?? '').toLowerCase() === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe a list of base URLs concurrently and return the first that responds.
 * Stops scheduling new probes as soon as a healthy server is found.
 */
async function firstHealthy(
  urls: string[],
  timeoutMs: number,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<string | null> {
  let next = 0;
  let done = 0;
  let found: string | null = null;
  const total = urls.length;

  const worker = async () => {
    while (next < total && !found) {
      const current = next++;
      const ok = await probeHealth(urls[current], timeoutMs);
      done++;
      onProgress?.(done, total);
      if (ok) {
        found = urls[current];
        return;
      }
    }
  };

  const workers = Math.max(1, Math.min(concurrency, total));
  await Promise.all(Array.from({ length: workers }, worker));
  return found;
}

function buildScanCandidates(device: string | null): string[] {
  const prefixes: string[] = [];

  if (device) {
    // Scan the phone's own Wi-Fi subnet first – the PC is almost always here.
    prefixes.push(device.split('.').slice(0, 3).join('.'));
  } else {
    // Fallback ranges when the device IP cannot be read.
    prefixes.push('192.168.1', '192.168.0', '192.168.8', '10.0.0', '10.0.1');
  }

  const hosts: string[] = [];
  for (const prefix of prefixes) {
    for (let i = 1; i <= 254; i++) hosts.push(`${prefix}.${i}`);
  }
  return hosts.map(toBaseUrl);
}

export interface DiscoverOptions {
  onProgress?: (message: string) => void;
  /** Skip the slow subnet scan (used for quick checks). */
  fastOnly?: boolean;
}

/**
 * Find a reachable backend on the local network.
 * Tries cached/last-good URLs and the Metro host first, then scans the Wi-Fi
 * subnet. Persists the working URL so future launches connect instantly.
 */
export async function discoverBackend(options: DiscoverOptions = {}): Promise<string | null> {
  const { onProgress, fastOnly = false } = options;
  const seen = new Set<string>();
  const fast: string[] = [];

  const add = (url?: string | null) => {
    if (!url) return;
    const clean = stripTrailingSlash(url);
    if (!/^[a-z]+:\/\//i.test(clean)) {
      const b = toBaseUrl(clean);
      if (!seen.has(b)) {
        seen.add(b);
        fast.push(b);
      }
      return;
    }
    if (!seen.has(clean)) {
      seen.add(clean);
      fast.push(clean);
    }
  };

  onProgress?.('Checking saved server...');
  add(metrosafe());
  add(await getLastGoodBase());
  add(EXPLICIT_ENV_URL);

  const fastHit = await firstHealthy(fast, FAST_PROBE_TIMEOUT_MS, Math.max(2, fast.length));
  if (fastHit) {
    await setLastGoodBase(fastHit);
    onProgress?.('Connected.');
    return fastHit;
  }

  if (fastOnly) return null;

  const device = await deviceIp();
  onProgress?.(device ? 'Scanning your Wi-Fi network...' : 'Scanning local network...');
  const scanHit = await firstHealthy(
    buildScanCandidates(device),
    SCAN_PROBE_TIMEOUT_MS,
    SCAN_CONCURRENCY,
    (done, total) => onProgress?.(`Scanning network... ${Math.round((done / total) * 100)}%`),
  );

  if (scanHit) {
    await setLastGoodBase(scanHit);
    onProgress?.('Connected.');
    return scanHit;
  }

  return null;
}

function metrosafe(): string | null {
  const h = metroHost();
  return h ? toBaseUrl(h) : null;
}
