import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Send,
  Sliders,
  Settings as SettingsIcon,
  HelpCircle,
  Check,
} from 'lucide-react';
import {
  getStoredSettings,
  saveStoredSettings,
  UserSettings,
  DEFAULT_SETTINGS,
} from '../services/settings';
import { ActivationData } from '../types';
import { DEFAULT_TELEGRAM_CHANNEL } from '../services/activation';

interface SettingsProps {
  activation: ActivationData | null;
  onLogout: () => void;
  lang: 'ar' | 'en';
  onBackToDashboard?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  activation,
  onLogout,
  lang,
  onBackToDashboard,
}) => {
  const isAr = lang === 'ar';

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setSettings(getStoredSettings());
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveStoredSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    saveStoredSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
    setTestResult(null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleTestKey = async () => {
    if (!settings.geminiApiKey.trim()) {
      setTestResult({
        success: false,
        message: isAr
          ? 'يرجى إدخال مفتاح Gemini API أولاً لإجراء الفحص.'
          : 'Please enter a Gemini API key first to test.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/gemini/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': settings.geminiApiKey.trim(),
        },
        body: JSON.stringify({ apiKey: settings.geminiApiKey.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message:
            data.message ||
            (isAr
              ? 'تم التحقق بنجاح! مفتاح Gemini API صالح وشغال بنجاح.'
              : 'Gemini API Key validated successfully!'),
        });
      } else {
        setTestResult({
          success: false,
          message:
            data.message ||
            (isAr
              ? 'المفتاح غير صالح أو لم يتم تفعيله بشكل صحيح.'
              : 'Invalid API Key or expired credentials.'),
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: isAr
          ? 'حدث خطأ في الاتصال بالخادم أثناء فحص المفتاح.'
          : 'Network error occurred while validating the key.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wide">
              {isAr ? 'إعدادات المنصة و Gemini API' : 'NABMEDIA Settings & API'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'إدارة مفتاح Google Gemini API وتخصيص تفضيلات المونتاج واستخراج الكابتشن'
                : 'Manage your Gemini API key and customize default editing preferences'}
            </p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
          >
            {isAr ? 'العودة للوحة الأدوات' : 'Back to Dashboard'}
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-300 text-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{isAr ? 'تم حفظ كافة الإعدادات بنجاح!' : 'Settings saved successfully!'}</span>
        </div>
      )}

      {/* SECTION 1: GEMINI API KEY */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">
                {isAr ? 'مفتاح Google Gemini API الخاص بك' : 'Your Google Gemini API Key'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              {isAr
                ? 'ضع مفتاح Gemini API الخاص بك هنا لاستخدامه في تفريغ واستخراج الكابتشن الفيروسي، والترجمة السريعة لملفات SRT. يتم حفظ المفتاح بأمان في متصفحك فقط.'
                : 'Enter your personal Gemini API key to power instant transcription and AI subtitle translation. Your key is stored securely in your browser.'}
            </p>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/60 border border-purple-800/40 rounded-lg transition-colors"
          >
            <span>{isAr ? 'احصل على مفتاح مجاني' : 'Get Free Key'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Security & Zero Developer Credit Policy Notice */}
        <div className="p-4 rounded-xl border bg-amber-950/20 border-amber-800/40 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'سياسة استهلاك الرصيد الصارمة: حصرياً عبر مفتاحك الشخصي' : 'Strict Developer Credit Protection: User Key Only'}</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {isAr
              ? 'تم ضبط المنصة برمجياً لتعمل حصراً ومباشرةً بمفتاح Google Gemini API الشخصي الخاص بك. لن يتم استخدام أو استهلاك أي رصيد أو كوتا من حساب المطور إطلاقاً. مفتاحك الشخصي مجاني 100% من Google AI Studio ويُحفظ محلياً في متصفحك فقط.'
              : 'The platform is strictly programmed to operate exclusively with your own personal Gemini API key. Zero credits will ever be consumed from the developer account. Your key is 100% free from Google AI Studio and stored only in your local browser.'}
          </p>
        </div>

        {/* Status Callout */}
        <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs bg-slate-900/60 border-slate-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                settings.geminiApiKey ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-200">
              {settings.geminiApiKey
                ? isAr
                  ? 'مفتاحك الشخصي نشط ومُعتمد (يُستهلك فقط من حصتك المجانية لدى Google)'
                  : 'Personal Gemini Key Active (Using your own free Google quota)'
                : isAr
                ? 'مطلوب إدخال المفتاح لتفعيل تفريغ وترجمة الذكاء الاصطناعي (حماية رصيد المطور 100%)'
                : 'API Key Required to enable AI tools (Developer account is protected)'}
            </span>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer noopener"
            className="sm:hidden text-purple-400 underline font-medium"
          >
            {isAr ? 'احصل على مفتاح' : 'Get Key'}
          </a>
        </div>

        {/* Input Box */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            {isAr ? 'رمز المفتاح (API Key)' : 'API Key string'}
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={settings.geminiApiKey}
              onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 bg-[#0a0e17] border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono text-sm tracking-wider pr-10 pl-24"
            />
            <KeyRound className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />

            <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                title={showApiKey ? 'إخفاء المفتاح' : 'إظهار المفتاح'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
            {isAr
              ? 'يبدأ المفتاح عادة بـ AIzaSy. يمكنك الحصول عليه بضغطة زر مجاناً من Google AI Studio.'
              : 'Keys typically start with AIzaSy. Available for free via Google AI Studio.'}
          </p>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
              testResult.success
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : 'bg-red-950/50 border-red-800 text-red-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="leading-relaxed font-medium">{testResult.message}</span>
          </div>
        )}

        {/* Actions for API Key */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isTesting || !settings.geminiApiKey.trim()}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isTesting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isAr ? 'اختبار وصلاحية المفتاح' : 'Test API Key'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isAr ? 'حفظ المفتاح والإعدادات' : 'Save Key'}</span>
          </button>

          {settings.geminiApiKey && (
            <button
              type="button"
              onClick={() => {
                setSettings({ ...settings, geminiApiKey: '' });
                saveStoredSettings({ geminiApiKey: '' });
                setTestResult(null);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 2000);
              }}
              className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
            >
              {isAr ? 'مسح المفتاح والعودة للافتراضي' : 'Clear Custom Key'}
            </button>
          )}
        </div>
      </div>

      {/* SECTION 2: EDITING PREFERENCES */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-bold text-white">
            {isAr ? 'تفضيلات المونتاج الافتراضية' : 'Default Editing Preferences'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Default Words per line */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              {isAr
                ? 'عدد الكلمات الافتراضي لكل سطر كابتشن'
                : 'Default Words Limit Per Caption Block'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 5].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSettings({ ...settings, defaultWordsPerLine: count })}
                  className={`py-2 px-3 text-xs font-mono font-semibold rounded-xl border transition-all cursor-pointer ${
                    settings.defaultWordsPerLine === count
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md shadow-purple-600/30'
                      : 'bg-[#0a0e17] border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {count} {isAr ? 'كلمات' : 'words'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              {isAr
                ? 'العدد الموصى به لريلز وتيك توك هو 3 كلمات لتحقيق أعلى نسبة بقاء للمشاهدين.'
                : '3 words is recommended for maximum viral retention on short platforms.'}
            </p>
          </div>

          {/* Default Dialect */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              {isAr ? 'اللهجة المفضلة للتفريغ التلقائي' : 'Default Spoken Dialect'}
            </label>
            <select
              value={settings.defaultDialect}
              onChange={(e) => setSettings({ ...settings, defaultDialect: e.target.value })}
              className="w-full px-3 py-2.5 bg-[#0a0e17] border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="العربية الفصحى">العربية الفصحى (Modern Standard Arabic)</option>
              <option value="اللهجة المصرية">اللهجة المصرية (Egyptian Arabic)</option>
              <option value="اللهجة السعودية/الخليجية">اللهجة السعودية / الخليجية (Gulf Arabic)</option>
              <option value="اللهجة الشامية">اللهجة الشامية (Levantine Arabic)</option>
              <option value="اللهجة المغربية">اللهجة المغربية (Moroccan Darija)</option>
              <option value="English (US)">English (US)</option>
              <option value="English (UK)">English (UK)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isAr ? 'حفظ التفضيلات' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: LICENSE & TELEGRAM */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              {isAr ? 'حالة الحساب والترخيص' : 'Account & License Status'}
            </h2>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 rounded-lg">
            {activation?.tier || 'VIP Creator Pro'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-400 block">{isAr ? 'كود التفعيل النشط:' : 'Active Code:'}</span>
            <span className="font-mono text-white text-sm font-bold">
              {activation?.code || 'EP3120-SFVT22-S156DR-23F562'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-900/70 border border-slate-800 rounded-xl space-y-1">
            <span className="text-slate-400 block">{isAr ? 'تاريخ التفعيل:' : 'Activated At:'}</span>
            <span className="text-slate-300 font-mono">
              {activation?.activatedAt
                ? new Date(activation.activatedAt).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')
                : '2026-10-22'}
            </span>
          </div>
        </div>

        {/* Telegram Banner */}
        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
              <Send className="w-4 h-4 text-blue-400" />
              <span>{isAr ? 'قناة التلجرام الرسمية لتجديد الأكواد' : 'Official Telegram Channel'}</span>
            </div>
            <p className="text-xs text-slate-300">
              {isAr
                ? 'انضم إلى قناتنا الرسمية للحصول على أكواد التفعيل الحصرية والتحديثات الدورية.'
                : 'Join our official channel for exclusive VIP activation keys and feature updates.'}
            </p>
          </div>

          <a
            href={DEFAULT_TELEGRAM_CHANNEL}
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
          >
            <span>t.me/nabmediastudio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'استعادة الإعدادات الافتراضية' : 'Reset to Defaults'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1.5 bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-800/40 cursor-pointer"
          >
            <span>{isAr ? 'إلغاء التفعيل وتسجيل الخروج' : 'Logout / Deactivate'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
