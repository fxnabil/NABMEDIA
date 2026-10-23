import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Play,
  Pause,
  Download,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Sparkles,
  Smartphone,
  Save,
  Plus,
  Trash2,
  Upload,
  Globe,
  Radio,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Layers,
  Wand2,
  Mic,
  Tv,
} from 'lucide-react';
import { SrtCue } from '../types';
import {
  generateWordLimitedCues,
  parseSrt,
  stringifySrt,
  secondsToSrtTime,
  srtTimeToSeconds,
} from '../services/srtParser';
import { saveProject } from '../services/storage';
import { getApiHeaders, hasGeminiApiKey } from '../services/settings';
import { extractAudioBase64FromFile } from '../services/audioProcessor';

interface SmartCaptionsProps {
  lang: 'ar' | 'en';
  onSavedToProjects?: () => void;
  initialSrt?: string;
  initialScriptText?: string;
  onBackToDashboard?: () => void;
  onOpenSettings?: () => void;
  onSendToViralHooks?: (topic: string) => void;
  onSendToReelsScript?: (topic: string) => void;
}

const DIALECTS_LIST = [
  { id: 'العربية الفصحى', nameAr: 'العربية الفصحى (Modern Standard)', lang: 'ar' },
  { id: 'اللهجة المصرية', nameAr: 'اللهجة المصرية (Egyptian Arabic)', lang: 'ar' },
  { id: 'اللهجة السعودية/الخليجية', nameAr: 'اللهجة السعودية والخليجية (Gulf Arabic)', lang: 'ar' },
  { id: 'اللهجة الشامية', nameAr: 'اللهجة الشامية (Levantine Arabic)', lang: 'ar' },
  { id: 'اللهجة المغربية', nameAr: 'الدارجة المغربية (Moroccan Darija)', lang: 'ar' },
  { id: 'اللهجة الجزائرية', nameAr: 'اللهجة الجزائرية (Algerian Arabic)', lang: 'ar' },
  { id: 'اللهجة العراقية', nameAr: 'اللهجة العراقية (Iraqi Arabic)', lang: 'ar' },
  { id: 'English (US)', nameAr: 'الإنجليزية الأمريكية (English US)', lang: 'en' },
  { id: 'English (UK)', nameAr: 'الإنجليزية البريطانية (English UK)', lang: 'en' },
  { id: 'Español', nameAr: 'الإسبانية (Spanish)', lang: 'es' },
  { id: 'Français', nameAr: 'الفرنسية (French)', lang: 'fr' },
];

export const SmartCaptions: React.FC<SmartCaptionsProps> = ({
  lang,
  onSavedToProjects,
  initialSrt,
  initialScriptText,
  onBackToDashboard,
  onOpenSettings,
  onSendToViralHooks,
  onSendToReelsScript,
}) => {
  const isAr = lang === 'ar';

  // Mode: 'media' (audio/video file via Gemini) or 'script' (instant text-to-caption)
  const [activeMode, setActiveMode] = useState<'media' | 'script'>('media');

  // Step state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileDuration, setFileDuration] = useState<number>(15);
  const [audioBase64, setAudioBase64] = useState<string>('');
  const [isProcessingAudio, setIsProcessingAudio] = useState<boolean>(false);

  // Script text to caption state
  const [scriptInput, setScriptInput] = useState<string>(
    initialScriptText ||
      'توقف فوراً عن ارتكاب هذا الخطأ في المونتاج! 90% من صناع المحتوى ينسون تقطيع السكتات والكابتشن السريع في أول 3 ثواني، وهذا يدمر ريتش الريلز تماماً.'
  );

  // Language & Dialect
  const [selectedDialect, setSelectedDialect] = useState<string>('العربية الفصحى');
  const [wordsPerLine, setWordsPerLine] = useState<number>(3);

  // Captions state
  const [cues, setCues] = useState<SrtCue[]>([]);
  const [captionStyle, setCaptionStyle] = useState<'hormozi' | 'cyber' | 'minimal' | 'impact'>('hormozi');

  // Loading & Playback
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [keyErrorMsg, setKeyErrorMsg] = useState<string>('');

  const timerRef = useRef<number | null>(null);
  const hasKey = hasGeminiApiKey();

  // If initialSrt or initialScriptText was passed
  useEffect(() => {
    if (initialSrt) {
      const parsed = parseSrt(initialSrt);
      if (parsed.length > 0) {
        setCues(parsed);
        const maxTime = Math.max(...parsed.map((c) => c.endSeconds));
        setFileDuration(Math.ceil(maxTime) || 14);
      }
    }
  }, [initialSrt]);

  useEffect(() => {
    if (initialScriptText) {
      setScriptInput(initialScriptText);
      setActiveMode('script');
    }
  }, [initialScriptText]);

  // Handle media file upload with ROBUST Web Audio extraction
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setStatusMsg('');
    setKeyErrorMsg('');
    setIsProcessingAudio(true);

    try {
      // Extract pristine 16kHz mono WAV using Web Audio API (works with MP4, WebM, MOV, MP3, WAV)
      const { base64, duration } = await extractAudioBase64FromFile(file);
      setAudioBase64(base64);
      if (duration && duration > 0) {
        setFileDuration(duration);
      }
      setStatusMsg(
        isAr
          ? `تم تجهيز ملف الصوت (${file.name}) بنجاح! المدة: ${duration} ثانية.`
          : `Audio track ready (${file.name}), duration: ${duration}s.`
      );
    } catch (err: any) {
      console.error('Audio extraction error:', err);
      setKeyErrorMsg(
        isAr
          ? 'تعذر استخراج مسار الصوت من هذا الملف. يرجى تجربة ملف آخر أو استخدام التوليد من النص.'
          : 'Could not extract audio track. Try another file or use text script.'
      );
    } finally {
      setIsProcessingAudio(false);
    }
  };

  // Instant generation from Text/Script (Alex Hormozi fast-pacing)
  const handleGenerateFromScript = () => {
    setKeyErrorMsg('');
    setStatusMsg('');

    if (!scriptInput.trim()) {
      setKeyErrorMsg(isAr ? 'يرجى كتابة أو لصق نص السكريبت.' : 'Please enter script text.');
      return;
    }

    const estimatedDuration = Math.max(10, Math.ceil(scriptInput.trim().split(/\s+/).length / 2.5));
    setFileDuration(estimatedDuration);

    const generated = generateWordLimitedCues(scriptInput, wordsPerLine, estimatedDuration);
    if (generated.length > 0) {
      setCues(generated);
      setCurrentTime(0);
      setStatusMsg(
        isAr
          ? `تم توليد كابتشن هورموزي فوري (${generated.length} أسطر) بحد أقصى ${wordsPerLine} كلمات في السطر!`
          : `Generated ${generated.length} Hormozi-styled caption lines!`
      );
    }
  };

  // Extract captions with dialect and word limit (STRICT USER KEY ENFORCEMENT)
  const handleExtractCaptions = async () => {
    setKeyErrorMsg('');
    setStatusMsg('');

    // Strict check: Must have user's personal Gemini key to avoid consuming developer credits
    if (!hasGeminiApiKey()) {
      setKeyErrorMsg(
        isAr
          ? 'مطلوب إدخال مفتاح Gemini API الشخصي الخاص بك من صفحة الإعدادات لتشغيل الذكاء الاصطناعي. لن يتم استهلاك أي رصيد من المطور.'
          : 'Your personal Gemini API Key is required in Settings. Zero credits are consumed from the developer.'
      );
      return;
    }

    if (!selectedFile && !audioBase64) {
      setKeyErrorMsg(
        isAr ? 'يرجى اختيار ملف صوت أو فيديو أولاً للبدء بالتفريغ.' : 'Please select an audio or video file first.'
      );
      return;
    }

    setIsExtracting(true);

    try {
      const res = await fetch('/api/transcribe-captions', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          audioBase64: audioBase64 || '',
          mimeType: 'audio/wav',
          filename: selectedFile?.name || 'audio.wav',
          dialect: selectedDialect,
          wordsPerLine,
          approxDuration: fileDuration,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.requireApiKey) {
        setKeyErrorMsg(
          data.message ||
            (isAr
              ? 'مطلوب إدخال مفتاح Gemini API الشخصي الخاص بك في الإعدادات.'
              : 'Personal Gemini API key required in Settings.')
        );
        setIsExtracting(false);
        return;
      }

      if (data.srt) {
        const parsed = parseSrt(data.srt);
        if (parsed.length > 0) {
          setCues(parsed);
          setStatusMsg(
            isAr
              ? `تم استخراج الكابتشن بنجاح بواسطة مفتاح Gemini الخاص بك وفق (${selectedDialect}) بحد أقصى ${wordsPerLine} كلمات في السطر!`
              : `Captions extracted successfully via your Gemini Key in (${selectedDialect}) with ${wordsPerLine} words per line!`
          );
          setCurrentTime(0);
          return;
        }
      }

      throw new Error(data.message || 'Failed to parse SRT');
    } catch (err: any) {
      setKeyErrorMsg(
        err?.message ||
          (isAr
            ? 'حدث خطأ أثناء معالجة الصوت بواسطة مفتاح Gemini الخاص بك. تحقق من المفتاح في الإعدادات.'
            : 'Error processing audio with your Gemini key. Verify it in Settings.')
      );
    } finally {
      setIsExtracting(false);
    }
  };


  // Playback loop for 9:16 simulator
  useEffect(() => {
    if (isPlaying) {
      const interval = 50;
      timerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          const next = prev + interval / 1000;
          if (next >= fileDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });
      }, interval);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, fileDuration]);

  const activeCue = cues.find((c) => currentTime >= c.startSeconds && currentTime <= c.endSeconds);

  // Edit Cue text
  const handleUpdateCueText = (id: number, text: string) => {
    setCues((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
  };

  // Edit Cue times
  const handleUpdateCueTimes = (id: number, start: string, end: string) => {
    setCues((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              startTime: start,
              endTime: end,
              startSeconds: srtTimeToSeconds(start),
              endSeconds: srtTimeToSeconds(end),
            }
          : c
      )
    );
  };

  const handleDeleteCue = (id: number) => {
    setCues((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddCue = () => {
    const lastEnd = cues.length > 0 ? cues[cues.length - 1].endSeconds : 0;
    const newStart = lastEnd + 0.1;
    const newEnd = newStart + 1.2;
    setCues([
      ...cues,
      {
        id: cues.length + 1,
        startTime: secondsToSrtTime(newStart),
        endTime: secondsToSrtTime(newEnd),
        startSeconds: newStart,
        endSeconds: newEnd,
        text: isAr ? 'نص كابتشن جديد' : 'New caption cue',
      },
    ]);
  };

  const handleDownloadSrt = () => {
    const srtText = stringifySrt(cues);
    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NABMEDIA_Captions_${selectedDialect.replace(/[\s/]/g, '_')}_${wordsPerLine}words.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySrt = () => {
    navigator.clipboard.writeText(stringifySrt(cues));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToProjects = () => {
    saveProject({
      title: isAr
        ? `كابتشن: ${fileName || selectedDialect} (${wordsPerLine} كلمات)`
        : `Captions: ${fileName || selectedDialect} (${wordsPerLine} words)`,
      toolType: 'smart_captions',
      summary: isAr
        ? `كابتشن تم استخراجه بلهجة [${selectedDialect}] بحد أقصى ${wordsPerLine} كلمات في السطر (${cues.length} مقطع)`
        : `Extracted captions in [${selectedDialect}] with max ${wordsPerLine} words/line (${cues.length} cues)`,
      data: {
        dialect: selectedDialect,
        wordsPerLine,
        cuesCount: cues.length,
        style: captionStyle,
        srtContent: stringifySrt(cues),
      },
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onSavedToProjects?.();
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-7 text-right space-y-6">
      {/* Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isAr ? 'أداة استخراج وتوليد كابتشن SRT بالكلمات' : 'Smart Captions SRT (Media & Dialect)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'ارفع ملف الصوت أو الفيديو ثم اختر اللغة واللهجة وعدد الكلمات لاستخراج كابتشن احترافي متزامن'
                : 'Upload audio/video, select language & dialect, and extract word-capped subtitles'}
            </p>
          </div>
        </div>

        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>{isAr ? 'العودة للوحة الأدوات' : 'Back to Dashboard'}</span>
          </button>
        )}
      </div>

      {/* Strict API Key Policy Banner */}
      {!hasKey ? (
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">
                {isAr
                  ? 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك'
                  : 'Your Personal Gemini API Key is Required'}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isAr
                  ? 'تعمل المنصة حصراً بمفتاحك الشخصي المجاني لحماية رصيد المطور 100% (المفتاح مجاني ومحفوظ في جهازك).'
                  : 'The platform operates exclusively via your free personal key. Zero developer credits are used.'}
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

      {/* Error alert if key error or call failure */}
      {keyErrorMsg && (
        <div className="p-4 bg-rose-950/50 border border-rose-800/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{keyErrorMsg}</span>
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

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#0d121d] border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveMode('media')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'media'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileAudio className="w-4 h-4" />
          <span>{isAr ? 'تفريغ ملف صوت/فيديو (Gemini AI ذكي)' : 'Transcribe Media File'}</span>
        </button>

        <button
          onClick={() => setActiveMode('script')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMode === 'script'
              ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          <span>{isAr ? 'توليد كابتشن هورموزي من سكريبت/نص (فوري بدون مفتاح)' : 'Script-to-Captions (Instant)'}</span>
        </button>
      </div>

      {/* MODE 1: MEDIA EXTRACTION */}
      {activeMode === 'media' && (
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Step 1: Upload Media File */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? '1. رفع ملف الصوت أو الفيديو' : '1. Upload Audio or Video'}</span>
              </label>

              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer bg-[#0d121d] transition-all">
                {isProcessingAudio ? (
                  <div className="py-2 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {isAr ? 'جاري تجهيز مسار الصوت 16kHz...' : 'Preparing audio...'}
                    </span>
                  </div>
                ) : (
                  <>
                    <FileAudio className="w-7 h-7 text-emerald-400 mb-2" />
                    <span className="text-xs font-semibold text-white">
                      {fileName ? fileName : isAr ? 'اختر ملف الصوت أو الفيديو' : 'Choose media file'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-1">
                      MP3, WAV, M4A, MP4, MOV, WebM
                    </span>
                  </>
                )}
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Step 2: Language & Dialect Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>{isAr ? '2. اختيار اللغة واللهجة' : '2. Language & Dialect'}</span>
              </label>

              <select
                value={selectedDialect}
                onChange={(e) => setSelectedDialect(e.target.value)}
                className="w-full px-3.5 py-3 bg-[#0d121d] border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {DIALECTS_LIST.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameAr}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                {isAr
                  ? 'يتم استخراج الكلمات بدقة صوتية وفق خصوصية اللهجة ومفرداتها'
                  : 'Phonetic accuracy tailored to chosen regional dialect'}
              </p>
            </div>

            {/* Step 3: Word Limit per Line */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>{isAr ? '3. حد الكلمات لكل سطر' : '3. Word Limit'}</span>
                </label>
                <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                  {wordsPerLine} {isAr ? 'كلمات' : 'words'}
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setWordsPerLine(num)}
                    className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl border transition-colors cursor-pointer ${
                      wordsPerLine === num
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-[#0d121d] text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {num} {isAr ? 'ك' : 'w'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                {isAr ? '3 إلى 5 كلمات هو الأفضل لسرعة وتفاعل الريلز' : '3-5 words recommended for reels'}
              </p>
            </div>
          </div>

          {/* Extract CTA Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
            <span className="text-xs text-slate-400">
              {fileName ? (
                <span className="text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>الملف جاهز: {fileName} ({fileDuration} ثانية)</span>
                </span>
              ) : (
                <span>يرجى رفع ملف الفيديو أو الصوت للبدء بالتفريغ</span>
              )}
            </span>

            <button
              onClick={handleExtractCaptions}
              disabled={isExtracting || isProcessingAudio}
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isExtracting ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isAr ? 'استخراج وتجزئة الكابتشن الذكي' : 'Extract & Slice Captions'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: SCRIPT TEXT TO HORMOZI CAPTIONS (INSTANT) */}
      {activeMode === 'script' && (
        <div className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'نص السكريبت أو الكلام المنطوق' : 'Script or Spoken Text'}</span>
              </label>
              <span className="text-[11px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                {isAr ? 'يعمل فوراً بدون الحاجة لـ API' : 'Instant - No API Key needed'}
              </span>
            </div>
            <textarea
              value={scriptInput}
              onChange={(e) => setScriptInput(e.target.value)}
              rows={3}
              placeholder={isAr ? 'الصق سكريبت الريلز هنا...' : 'Paste your script text here...'}
              className="w-full px-4 py-3 bg-[#0d121d] border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-amber-400 leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">
                {isAr ? 'كلمات في كل سطر:' : 'Words per cue:'}
              </span>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setWordsPerLine(num)}
                    className={`w-9 h-8 text-xs font-mono font-bold rounded-lg border transition-colors cursor-pointer ${
                      wordsPerLine === num
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-[#0d121d] text-slate-300 border-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerateFromScript}
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-black text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Tv className="w-4 h-4" />
              <span>{isAr ? 'توليد كابتشن هورموزي بالتايم كود فورا' : 'Generate Hormozi Captions Now'}</span>
            </button>
          </div>
        </div>
      )}


      {/* Status banner */}
      {statusMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Main Results: 9:16 Preview + SRT Cues Table */}
      {cues.length > 0 && (
        <div className="space-y-6 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Visual Style Selector & Overview */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
                <span className="text-xs font-bold text-white block mb-2.5">
                  {isAr ? 'ستايل الخط والمظهر الفيروسي للكابتشن' : 'Viral Visual Caption Style'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: 'hormozi', nameAr: 'أليكس هورموزي', nameEn: 'Alex Hormozi' },
                    { id: 'cyber', nameAr: 'نيون سيبر', nameEn: 'Cyber Neon' },
                    { id: 'minimal', nameAr: 'أبيض مينيمال', nameEn: 'Minimalist' },
                    { id: 'impact', nameAr: 'أحمر هجومي', nameEn: 'Impact Red' },
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setCaptionStyle(style.id as any)}
                      className={`py-2 px-3 rounded-lg border text-center transition-colors cursor-pointer ${
                        captionStyle === style.id
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-semibold'
                          : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isAr ? style.nameAr : style.nameEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Summary Pill */}
              <div className="p-3 bg-[#0d121d] border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {isAr ? 'إجمالي المقاطع الزمنية:' : 'Total Cues:'}{' '}
                  <strong className="text-white font-mono">{cues.length}</strong>
                </span>
                <span className="text-slate-400">
                  {isAr ? 'اللهجة المطبقة:' : 'Dialect:'}{' '}
                  <strong className="text-emerald-400 font-semibold">{selectedDialect}</strong>
                </span>
                <span className="text-slate-400">
                  {isAr ? 'الحد الأقصى للكلمات:' : 'Word Limit:'}{' '}
                  <strong className="text-amber-400 font-mono">{wordsPerLine}</strong>
                </span>
              </div>
            </div>

            {/* 9:16 Video Player Simulator */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-xs bg-[#0d121d] border border-slate-700 rounded-3xl p-3 shadow-2xl flex flex-col items-center">
                <div className="w-24 h-4 bg-slate-800 rounded-full mb-3 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-700 mr-2" />
                  <div className="w-8 h-1 bg-slate-700 rounded-full" />
                </div>

                <div className="relative w-full aspect-[9/16] bg-gradient-to-b from-[#181d29] via-[#0d121d] to-[#121622] rounded-2xl overflow-hidden flex flex-col justify-between p-4 border border-slate-800 select-none">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 z-10">
                    <span className="font-mono bg-black/40 px-2 py-0.5 rounded">9:16 Reel</span>
                    <span className="font-mono text-emerald-400 tabular-nums">
                      {currentTime.toFixed(1)}s / {fileDuration}s
                    </span>
                  </div>

                  {/* Animated caption display */}
                  <div className="my-auto text-center px-3 z-10">
                    {activeCue ? (
                      <div className="transition-all duration-150 transform scale-105">
                        {captionStyle === 'hormozi' && (
                          <span className="inline-block text-xl sm:text-2xl font-black uppercase text-yellow-300 drop-shadow-[0_3px_5px_rgba(0,0,0,0.9)] tracking-tight px-3 py-1 bg-black/75 rounded-lg border border-yellow-400/40">
                            {activeCue.text}
                          </span>
                        )}

                        {captionStyle === 'cyber' && (
                          <span className="inline-block text-xl sm:text-2xl font-black uppercase text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)] tracking-tight px-3 py-1 bg-purple-950/80 rounded-lg border border-cyan-400">
                            {activeCue.text}
                          </span>
                        )}

                        {captionStyle === 'minimal' && (
                          <span className="inline-block text-lg sm:text-xl font-bold text-white tracking-normal px-3 py-1 bg-black/60 rounded-md backdrop-blur-sm">
                            {activeCue.text}
                          </span>
                        )}

                        {captionStyle === 'impact' && (
                          <span className="inline-block text-xl sm:text-2xl font-black uppercase text-white bg-red-600 px-3 py-1 rounded shadow-lg">
                            {activeCue.text}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">
                        {isAr ? 'اضغط تشغيل للمعاينة الحية' : 'Press play to preview'}
                      </span>
                    )}
                  </div>

                  {/* Progress & Controls */}
                  <div className="w-full z-10 space-y-2">
                    <div className="w-full h-1 bg-slate-700/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-75"
                        style={{ width: `${(currentTime / fileDuration) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg cursor-pointer"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>
                      <button
                        onClick={() => {
                          setIsPlaying(false);
                          setCurrentTime(0);
                        }}
                        className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Cues Table */}
          <div className="border-t border-slate-800 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">
                {isAr ? 'محرر توقيتات ونصوص الكابتشن (SRT Cues)' : 'SRT Cues Editor'}
              </h3>
              <button
                onClick={handleAddCue}
                className="px-3 py-1.5 text-xs font-medium text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-700/40 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة سطر' : 'Add Cue'}</span>
              </button>
            </div>

            <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-xl bg-[#0d121d]">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-900/80 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 w-12 text-center">#</th>
                    <th className="p-2.5 w-28 text-center">{isAr ? 'البداية' : 'Start'}</th>
                    <th className="p-2.5 w-28 text-center">{isAr ? 'النهاية' : 'End'}</th>
                    <th className="p-2.5">{isAr ? 'نص الكابتشن' : 'Subtitle Text'}</th>
                    <th className="p-2.5 w-16 text-center">{isAr ? 'الكلمات' : 'Words'}</th>
                    <th className="p-2.5 w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {cues.map((cue) => {
                    const isCurrent = currentTime >= cue.startSeconds && currentTime <= cue.endSeconds;
                    const wordsCount = cue.text.trim().split(/\s+/).filter(Boolean).length;
                    return (
                      <tr
                        key={cue.id}
                        className={`transition-colors ${
                          isCurrent ? 'bg-emerald-950/40 text-emerald-200' : 'hover:bg-slate-800/30 text-slate-300'
                        }`}
                      >
                        <td className="p-2 text-center text-slate-500 font-bold">{cue.id}</td>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            value={cue.startTime}
                            onChange={(e) => handleUpdateCueTimes(cue.id, e.target.value, cue.endTime)}
                            className="w-24 px-1.5 py-1 text-center bg-black/40 border border-slate-700 rounded text-[11px] text-slate-200 focus:border-emerald-500 font-mono tabular-nums"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            value={cue.endTime}
                            onChange={(e) => handleUpdateCueTimes(cue.id, cue.startTime, e.target.value)}
                            className="w-24 px-1.5 py-1 text-center bg-black/40 border border-slate-700 rounded text-[11px] text-slate-200 focus:border-emerald-500 font-mono tabular-nums"
                          />
                        </td>
                        <td className="p-2 font-sans font-medium">
                          <input
                            type="text"
                            value={cue.text}
                            onChange={(e) => handleUpdateCueText(cue.id, e.target.value)}
                            className="w-full px-2 py-1 bg-black/40 border border-slate-700 rounded text-xs text-white focus:border-emerald-500"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                              wordsCount <= wordsPerLine
                                ? 'text-emerald-400 bg-emerald-950/40'
                                : 'text-amber-400 bg-amber-950/40'
                            }`}
                          >
                            {wordsCount}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleDeleteCue(cue.id)}
                            className="text-slate-500 hover:text-red-400 p-1 transition-colors cursor-pointer"
                            title="حذف هذا السطر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <button
                onClick={handleSaveToProjects}
                className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{isAr ? 'تم الحفظ في المشاريع!' : 'Saved!'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>{isAr ? 'حفظ في المشاريع السابقة' : 'Save Project'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySrt}
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
                      <span>{isAr ? 'نسخ كود SRT' : 'Copy SRT'}</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadSrt}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحميل ملف (.SRT)' : 'Download .SRT'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
