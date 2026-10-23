import React, { useState } from 'react';
import {
  Languages,
  ArrowRight,
  Upload,
  Download,
  Copy,
  Check,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Repeat,
  FileText,
} from 'lucide-react';
import { parseSrt, stringifySrt } from '../services/srtParser';
import { saveProject } from '../services/storage';
import { getApiHeaders, hasGeminiApiKey } from '../services/settings';

interface SubtitleTranslatorProps {
  lang: 'ar' | 'en';
  onSavedToProjects?: () => void;
  onSendToSmartCaptions?: (srt: string) => void;
  onBackToDashboard?: () => void;
  onOpenSettings?: () => void;
}

const SAMPLE_SRT_AR = `1
00:00:00,100 --> 00:00:01,400
أهلاً بكم في هذا الفيديو السريع

2
00:00:01,450 --> 00:00:02,800
اليوم سنتعلم أهم أسرار المونتاج

3
00:00:02,850 --> 00:00:04,200
كيف تقطع السكتات بثانية واحدة

4
00:00:04,250 --> 00:00:05,900
وتجعل المشاهد يكمل حتى النهاية!`;

const SAMPLE_SRT_EN = `1
00:00:00,100 --> 00:00:01,400
Welcome back to this video

2
00:00:01,450 --> 00:00:02,800
Today we unlock top editing secrets

3
00:00:02,850 --> 00:00:04,200
Cut dead pauses in seconds

4
00:00:04,250 --> 00:00:05,900
And keep viewers hooked till the end!`;

const TARGET_LANGUAGES = [
  { code: 'en', nameAr: 'الإنجليزية (English)', nameEn: 'English' },
  { code: 'ar', nameAr: 'العربية (Arabic)', nameEn: 'Arabic' },
  { code: 'es', nameAr: 'الإسبانية (Spanish)', nameEn: 'Spanish' },
  { code: 'fr', nameAr: 'الفرنسية (French)', nameEn: 'French' },
  { code: 'de', nameAr: 'الألمانية (German)', nameEn: 'German' },
  { code: 'tr', nameAr: 'التركية (Turkish)', nameEn: 'Turkish' },
  { code: 'ru', nameAr: 'الروسية (Russian)', nameEn: 'Russian' },
  { code: 'ja', nameAr: 'اليابانية (Japanese)', nameEn: 'Japanese' },
];

export const SubtitleTranslator: React.FC<SubtitleTranslatorProps> = ({
  lang,
  onSavedToProjects,
  onSendToSmartCaptions,
  onBackToDashboard,
  onOpenSettings,
}) => {
  const isAr = lang === 'ar';

  const [sourceSrt, setSourceSrt] = useState<string>(SAMPLE_SRT_AR);
  const [targetLang, setTargetLang] = useState<string>('en');
  const [translatedSrt, setTranslatedSrt] = useState<string>('');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const hasKey = hasGeminiApiKey();

  const handleTranslate = async () => {
    if (!sourceSrt.trim()) {
      setErrorMessage(isAr ? 'يرجى إدخال أو رفع ملف SRT أولاً.' : 'Please enter or upload an SRT file.');
      return;
    }

    // STRICT CHECK: User must provide their own Gemini API key to protect developer credit
    if (!hasGeminiApiKey()) {
      setErrorMessage(
        isAr
          ? 'مطلوب إدخال مفتاح Gemini API الشخصي الخاص بك من قائمة "الإعدادات" لترجمة السبتيتل. تم قفل استهلاك رصيد المطور بنسبة 100% حفاظاً على الأمان.'
          : 'Your personal Gemini API Key is required in Settings to translate subtitles. Zero developer credits are used.'
      );
      return;
    }

    setIsTranslating(true);
    setStatusMsg('');
    setErrorMessage('');

    try {
      const res = await fetch('/api/translate-srt', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          srtContent: sourceSrt,
          targetLanguage: targetLang,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.requireApiKey) {
        setErrorMessage(
          data.message ||
            (isAr
              ? 'مطلوب إدخال مفتاح Gemini API الشخصي الخاص بك في الإعدادات.'
              : 'Personal Gemini API key required in Settings.')
        );
        return;
      }

      if (data.translatedSrt) {
        setTranslatedSrt(data.translatedSrt);
        setStatusMsg(
          isAr
            ? `تمت الترجمة بنجاح عبر مفتاح Gemini الخاص بك إلى (${targetLang.toUpperCase()}) مع حفظ التوقيتات والأرقام بدقة!`
            : `Translated to (${targetLang.toUpperCase()}) using your personal Gemini key!`
        );
        return;
      }

      throw new Error(data.message || 'Failed to translate SRT');
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          (isAr
            ? 'حدث خطأ أثناء الاتصال بنموذج Gemini عبر مفتاحك. تحقق من صلاحية المفتاح في الإعدادات.'
            : 'Error translating subtitles with your key. Verify it in Settings.')
      );
    } finally {
      setIsTranslating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setSourceSrt(content);
        setTranslatedSrt('');
        setStatusMsg(isAr ? `تم تحميل الملف: ${file.name}` : `Loaded: ${file.name}`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!translatedSrt) return;
    const blob = new Blob([translatedSrt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NABMEDIA_Translated_${targetLang}_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    if (!translatedSrt) return;
    navigator.clipboard.writeText(translatedSrt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToProjects = () => {
    if (!translatedSrt) return;
    const cues = parseSrt(translatedSrt);
    saveProject({
      title: isAr
        ? `ترجمة كابتشن إلى (${targetLang.toUpperCase()})`
        : `Subtitle Translation (${targetLang.toUpperCase()})`,
      toolType: 'subtitle_translator',
      summary: isAr
        ? `ترجمة دقيقة لـ ${cues.length} مقطع زمني إلى ${targetLang.toUpperCase()}`
        : `Translated ${cues.length} cues into ${targetLang.toUpperCase()}`,
      data: {
        targetLang,
        cuesCount: cues.length,
        translatedSrt,
      },
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onSavedToProjects?.();
  };

  const sourceCues = parseSrt(sourceSrt);
  const translatedCues = parseSrt(translatedSrt);

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-7 text-right space-y-6">
      {/* Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isAr ? 'أداة ترجمة الكابتشن (Subtitle Translator)' : 'Subtitle & SRT Translator'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'ترجمة ملفات الترجمة (.srt) إلى لغات متعددة مع الحفاظ الصارم على أرقام المقاطع وتوقيتات الظهور'
                : 'Accurately translate .srt subtitle files preserving timecodes and sequential indices'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isAr ? 'العودة للوحة الأدوات' : 'Back to Dashboard'}</span>
            </button>
          )}

          <label className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>{isAr ? 'رفع ملف (.SRT)' : 'Upload .SRT'}</span>
            <input type="file" accept=".srt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Strict API Key Policy Banner */}
      {!hasKey ? (
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">
                {isAr
                  ? 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك لترجمة السبتيتل'
                  : 'Your Personal Gemini API Key is Required for Translation'}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isAr
                  ? 'تعمل الترجمة حصراً بمفتاحك الشخصي المجاني لحماية رصيد المطور 100% (المفتاح مجاني ومحفوظ في جهازك).'
                  : 'The translator operates exclusively via your personal key. Zero developer credits are used.'}
              </p>
            </div>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shrink-0 shadow"
            >
              {isAr ? '⚙️ إضافة المفتاح في الإعدادات' : '⚙️ Add Key in Settings'}
            </button>
          )}
        </div>
      ) : (
        <div className="px-4 py-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {isAr
                ? 'مفتاح Gemini الشخصي مُفعّل (يُستهلك فقط من كوتتك المجانية لدى Google - حماية رصيد المطور 100%)'
                : 'Personal Gemini Key Active (Zero developer credit consumption)'}
            </span>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
            >
              {isAr ? 'تعديل المفتاح' : 'Change Key'}
            </button>
          )}
        </div>
      )}

      {/* Error alert if translation error or key missing */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/50 border border-rose-800/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              {isAr ? 'فتح الإعدادات الآن' : 'Open Settings'}
            </button>
          )}
        </div>
      )}

      {/* Language Bar & Actions */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-300">
            {isAr ? 'اختر لغة الترجمة:' : 'Target Language:'}
          </span>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="px-3 py-2 text-xs bg-[#0d121d] border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            {TARGET_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {isAr ? l.nameAr : l.nameEn}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setSourceSrt(sourceSrt === SAMPLE_SRT_AR ? SAMPLE_SRT_EN : SAMPLE_SRT_AR)}
            className="text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
          >
            {isAr ? 'تبديل النموذج التجريبي' : 'Toggle Sample SRT'}
          </button>
        </div>

        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
        >
          {isTranslating ? (
            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'ترجمة فورية مع حفظ التوقيت' : 'Translate Subtitles Now'}</span>
            </>
          )}
        </button>
      </div>

      {/* Error or Success Notice */}
      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-xl flex items-center gap-2 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Side by Side Diff Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Original SRT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300">
              {isAr ? 'الملف الأصلي (Original SRT)' : 'Original Subtitles'}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              {sourceCues.length} {isAr ? 'مقطع' : 'cues'}
            </span>
          </div>
          <textarea
            rows={12}
            value={sourceSrt}
            onChange={(e) => setSourceSrt(e.target.value)}
            placeholder="1\n00:00:01,000 --> 00:00:03,000\nText..."
            className="w-full p-3.5 bg-[#0d121d] border border-slate-700/80 rounded-xl text-slate-200 text-xs font-mono leading-relaxed focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Translated SRT */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-blue-300">
              {isAr ? 'الترجمة الناتجة (Translated SRT)' : 'Translated Subtitles'}
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              {translatedCues.length} {isAr ? 'مقطع' : 'cues'}
            </span>
          </div>
          <textarea
            rows={12}
            readOnly
            value={translatedSrt}
            placeholder={
              isAr
                ? 'ستظهر الترجمة المتطابقة مع التوقيت هنا بعد النقر على زر البدء...'
                : 'Translated SRT with preserved timestamps will appear here...'
            }
            className="w-full p-3.5 bg-[#0d121d] border border-blue-800/40 rounded-xl text-blue-100 text-xs font-mono leading-relaxed focus:outline-none"
          />
        </div>
      </div>

      {/* Bottom Actions */}
      {translatedSrt && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToProjects}
              className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{isAr ? 'تم الحفظ!' : 'Saved!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حفظ في المشاريع' : 'Save Project'}</span>
                </>
              )}
            </button>

            {onSendToSmartCaptions && (
              <button
                onClick={() => onSendToSmartCaptions(translatedSrt)}
                className="px-4 py-2.5 text-xs font-medium text-purple-300 hover:text-white bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="فتح هذا الملف في أداة الكابتشن لتقسيمه بحسب عدد الكلمات"
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{isAr ? 'إرسال إلى محرر الكابتشن' : 'Open in Smart Captions'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isAr ? 'نسخ الترجمة' : 'Copy SRT'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownload}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحميل ملف الترجمة (.SRT)' : 'Download .SRT'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
