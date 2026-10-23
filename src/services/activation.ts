import { ActivationData } from '../types';

const STORAGE_KEY = 'editsclups_activation_v1';
export const DEFAULT_TELEGRAM_CHANNEL = 'https://t.me/nabmediastudio';
export const DEFAULT_GITHUB_CODES_URL = 'https://raw.githubusercontent.com/fxnabil/nabmedia-studio/refs/heads/main/code.txt?token=GHSAT0AAAAAAENEBJXTWDOUEDIX7RA7G6NO2W2BNHQ';

export function normalizeGitHubRawUrl(urlStr: string): string {
  if (!urlStr) return DEFAULT_GITHUB_CODES_URL;
  let clean = urlStr.trim();
  if (clean.includes('github.com') && clean.includes('/blob/')) {
    clean = clean
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('http://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }
  return clean;
}

export function getActivationState(): ActivationData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivationData;
    if (parsed && parsed.isActivated && parsed.code) {
      return parsed;
    }
  } catch (e) {
    console.error('Error reading activation state:', e);
  }
  return null;
}

export function saveActivationState(code: string, githubUrl?: string): ActivationData {
  const data: ActivationData = {
    isActivated: true,
    code: code.trim().toUpperCase(),
    activatedAt: new Date().toISOString(),
    tier: 'VIP Creator Pro',
    githubUrl,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
}

export function logoutActivation(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Splits TXT content line by line using split('\n') as requested
 */
export function parseLinesFromTxt(txt: string): string[] {
  return txt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

// Official fallback codes list from user's code.txt
const OFFICIAL_PRESET_CODES = [
  'EP3120-SFVT22-S156DR-23F562',
  'NABMED-VIP100-202600-V01000',
  'EDITS-PRO-2026',
  'NABMEDIA-VIP-2026',
  'CLUPS-VIP-779',
  'CREATOR-KEY-994',
  'TIKTOK-REEL-2026',
  'VIRAL-FLOW-888',
  'SPECIAL-BETA-01',
  'YOUTUBE-EDIT-55',
  'EDITS-MASTER-VIP',
  'SMART-CAPTION-2026',
  'SILENCE-CUT-PRO',
  'NAB-STUDIO-PRO',
];

/**
 * Fetches codes from GitHub TXT file or local /code.txt
 */
export async function fetchValidCodes(githubUrl?: string): Promise<string[]> {
  const targetUrl = normalizeGitHubRawUrl(githubUrl || DEFAULT_GITHUB_CODES_URL);

  // Try 1: Remote GitHub URL
  try {
    const res = await fetch(targetUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const text = await res.text();
      const lines = parseLinesFromTxt(text);
      if (lines.length > 0) return lines;
    }
  } catch (err) {
    console.warn('Could not reach remote GitHub codes file:', err);
  }

  // Try 2: Local public/code.txt
  try {
    const localRes = await fetch('/code.txt');
    if (localRes.ok) {
      const text = await localRes.text();
      const lines = parseLinesFromTxt(text);
      if (lines.length > 0) return lines;
    }
  } catch (err) {
    console.warn('Could not read local /code.txt:', err);
  }

  return OFFICIAL_PRESET_CODES;
}

/**
 * Verifies if user code matches any line in the fetched TXT file
 */
export async function verifyActivationCode(
  inputCode: string,
  githubUrl?: string
): Promise<{ success: boolean; message: string; tier?: string }> {
  const cleanInput = inputCode.trim();
  if (!cleanInput) {
    return { success: false, message: 'يرجى إدخال كود التفعيل.' };
  }

  // 1. Try server verification API first
  try {
    const serverRes = await fetch('/api/activation/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: cleanInput, githubUrl }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.success) {
        saveActivationState(cleanInput, githubUrl);
        return { success: true, message: data.message, tier: data.activation?.tier };
      }
    } else {
      const errData = await serverRes.json().catch(() => null);
      if (errData && errData.message) {
        return { success: false, message: errData.message };
      }
    }
  } catch {
    // If backend is unreachable, continue with direct client check
  }

  // 2. Client-side line-by-line verification from TXT
  const validLines = await fetchValidCodes(githubUrl);
  const isMatch = validLines.some((line) => line.toUpperCase() === cleanInput.toUpperCase());

  if (isMatch) {
    saveActivationState(cleanInput, githubUrl);
    return {
      success: true,
      message: 'تم التحقق من الكود بنجاح من أسطر ملف الأكواد!',
      tier: 'VIP Creator Pro',
    };
  }

  return {
    success: false,
    message: 'الكود غير صالح أو غير صحيح',
  };
}
