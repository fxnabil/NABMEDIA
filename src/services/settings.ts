export interface UserSettings {
  geminiApiKey: string;
  defaultWordsPerLine: number;
  defaultDialect: string;
  defaultLanguage: string;
  silenceThresholdDb: number;
  minSilenceMs: number;
}

const SETTINGS_STORAGE_KEY = 'nabmedia_user_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: '',
  defaultWordsPerLine: 3,
  defaultDialect: 'العربية الفصحى',
  defaultLanguage: 'ar',
  silenceThresholdDb: -32,
  minSilenceMs: 350,
};

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to parse settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: Partial<UserSettings>): UserSettings {
  try {
    const current = getStoredSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function getGeminiApiKey(): string {
  return (getStoredSettings().geminiApiKey || '').trim();
}

export function hasGeminiApiKey(): boolean {
  return Boolean(getGeminiApiKey());
}

export function getApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const customKey = getGeminiApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (customKey) {
    headers['x-gemini-api-key'] = customKey;
  }

  return headers;
}
