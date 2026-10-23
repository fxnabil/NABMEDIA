import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Flame,
  Award,
  ArrowRight,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Eye,
  TrendingUp,
  Volume2,
  Tv,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Swords,
  Layers,
  Save,
  Send,
} from 'lucide-react';
import {
  HookScenario,
  RetentionAnalysis,
  ViralTitle,
  ViralHooksData,
  HookABComparison,
} from '../types';
import { getApiHeaders, hasGeminiApiKey } from '../services/settings';
import { saveProject } from '../services/storage';

interface ViralHooksGeneratorProps {
  lang: 'ar' | 'en';
  onSavedToProjects?: () => void;
  onSendToSmartCaptions?: (script: string) => void;
  onSendToReelsScript?: (topic: string) => void;
  onBackToDashboard?: () => void;
  onOpenSettings?: () => void;
  initialTopic?: string;
}

export const ViralHooksGenerator: React.FC<ViralHooksGeneratorProps> = ({
  lang,
  onSavedToProjects,
  onSendToSmartCaptions,
  onSendToReelsScript,
  onBackToDashboard,
  onOpenSettings,
  initialTopic = '',
}) => {
  const isAr = lang === 'ar';
  const hasKey = hasGeminiApiKey();

  // Inputs
  const [topicOrScript, setTopicOrScript] = useState<string>(
    initialTopic ||
      'كيف تبدأ العمل الحر في المونتاج وتحقق أول 1000 دولار شهرياً بدون لابتوب قوي'
  );
  const [duration, setDuration] = useState<string>('30-60s');
  const [tone, setTone] = useState<string>('حماسي وصادم');

  // Loading & Data states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [keyErrorMsg, setKeyErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [data, setData] = useState<ViralHooksData | null>(null);

  // A/B Testing states
  const [hookAId, setHookAId] = useState<number>(1);
  const [hookBId, setHookBId] = useState<number>(2);
  const [isComparingAB, setIsComparingAB] = useState<boolean>(false);
  const [abResult, setAbResult] = useState<HookABComparison | null>(null);

  // Copy feedback
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(identifier);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleGenerateHooks = async () => {
    setKeyErrorMsg('');
    setStatusMsg('');
    setAbResult(null);

    if (!topicOrScript.trim()) {
      setKeyErrorMsg(
        isAr ? 'يرجى كتابة موضوع الفيديو أو نص السكريبت.' : 'Please enter a video topic or script.'
      );
      return;
    }

    if (!hasGeminiApiKey()) {
      setKeyErrorMsg(
        isAr
          ? 'مطلوب إدخال مفتاح Gemini API الشخصي الخاص بك من صفحة الإعدادات لتشغيل الذكاء الاصطناعي. المنصة لا تستهلك أي رصيد من المطور.'
          : 'Your personal Gemini API Key is required in Settings. Zero credits are consumed from the developer.'
      );
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-hooks', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          topicOrScript: topicOrScript.trim(),
          duration,
          tone,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.requireApiKey) {
        setKeyErrorMsg(
          json.message ||
            (isAr
              ? 'مطلوب إدخال مفتاح Gemini API الشخصي الخاص بك في الإعدادات.'
              : 'Personal Gemini API key required in Settings.')
        );
        setIsGenerating(false);
        return;
      }

      if (json.data && json.data.hooks) {
        const payload: ViralHooksData = {
          topicOrScript: topicOrScript.trim(),
          hooks: json.data.hooks,
          retention: json.data.retention,
          titles: json.data.titles || [],
        };
        setData(payload);
        setStatusMsg(
          isAr
            ? 'تم ابتكار 5 سيناريوهات هوك فيروسية وتحليل الاحتفاظ بنجاح!'
            : '5 viral hook scenarios & retention analysis generated successfully!'
        );
      } else {
        throw new Error(json.message || 'Invalid response structure');
      }
    } catch (err: any) {
      setKeyErrorMsg(
        err?.message ||
          (isAr
            ? 'حدث خطأ أثناء توليد الهوكات. يرجى التحقق من مفتاح Gemini في الإعدادات.'
            : 'Error generating hooks with your Gemini key. Verify it in Settings.')
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRunABTest = async () => {
    if (!data?.hooks || data.hooks.length < 2) return;
    const hookA = data.hooks.find((h) => h.id === hookAId) || data.hooks[0];
    const hookB = data.hooks.find((h) => h.id === hookBId) || data.hooks[1];

    if (hookA.id === hookB.id) {
      setKeyErrorMsg(
        isAr ? 'يرجى اختيار هوكين مختلفين لإجراء مقارنة A/B.' : 'Please select two different hooks for A/B testing.'
      );
      return;
    }

    setIsComparingAB(true);
    setKeyErrorMsg('');

    try {
      const res = await fetch('/api/compare-hooks-ab', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          hookA,
          hookB,
          topic: topicOrScript,
        }),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setAbResult({
          hookAId: hookA.id,
          hookBId: hookB.id,
          winner: json.data.winner || 'A',
          winnerReason: json.data.winnerReason || '',
          hookAScore: json.data.hookAScore || 90,
          hookBScore: json.data.hookBScore || 85,
          demographicInsight: json.data.demographicInsight || '',
        });
      }
    } catch (err: any) {
      console.error('A/B test error:', err);
    } finally {
      setIsComparingAB(false);
    }
  };

  const handleSaveToProjects = () => {
    if (!data) return;
    saveProject({
      title: `هوكات وعناوين: ${topicOrScript.slice(0, 30)}...`,
      toolType: 'viral_hooks',
      summary: `5 سيناريوهات هوك لأول 3 ثواني + تحليل احتفاظ ${data.retention?.overallScore || 90}% + عناوين مليونية`,
      data,
    });
    setIsSaved(true);
    onSavedToProjects?.();
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-8 text-right font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium mb-2">
            <Flame className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'أداة الريلز والـ Shorts الفيروسية' : 'Viral Reels & Shorts Tool'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-amber-400" />
            <span>
              {isAr
                ? 'مولد الهوك والعناوين الفيروسية للريلز'
                : 'Viral Reels Hooks & Million-View Titles'}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            {isAr
              ? 'ابتكار 5 سيناريوهات هوك لأول 3 ثواني تضمن إيقاف التمرير (Stop the Scroll)، تحليل معدل الاحتفاظ بالجمهور، صياغة عناوين المليون مشاهدة، ومحاكاة اختبار A/B التنافسي.'
              : 'Generate 5 three-second scroll-stopping hooks, audience retention rate analysis, million-view titles, and competitive A/B testing.'}
          </p>
        </div>

        {data && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveToProjects}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSaved
                  ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4 text-purple-400" />}
              <span>{isSaved ? (isAr ? 'تم الحفظ بالمشاريع' : 'Saved!') : isAr ? 'حفظ المشروع' : 'Save'}</span>
            </button>
          </div>
        )}
      </div>

      {/* API Key Status Banner */}
      {!hasKey ? (
        <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-300">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">
                {isAr
                  ? 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك'
                  : 'Personal Gemini API Key Required'}
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isAr
                  ? 'المنصة تعتمد حصراً على مفتاحك الشخصي المجاني لحماية رصيد المطور 100% بدون أي تكلفة عليك.'
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

      {/* Error alert */}
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

      {/* Success banner */}
      {statusMsg && !keyErrorMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Input Form Card */}
      <div className="p-6 bg-[#0f1523] border border-slate-800 rounded-2xl shadow-xl space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'موضوع الفيديو أو فكرة الريلز أو مسودة السكريبت' : 'Video Topic, Reel Idea, or Draft Script'}</span>
            </label>
            <span className="text-[11px] text-slate-400">
              {topicOrScript.length} {isAr ? 'حرف' : 'chars'}
            </span>
          </div>
          <textarea
            value={topicOrScript}
            onChange={(e) => setTopicOrScript(e.target.value)}
            rows={3}
            placeholder={
              isAr
                ? 'اكتب فكرة الريلز بالتفصيل (مثال: أسباب فشل 90% من المبتدئين في العمل الحر، أو كيف تقطع السكتات بمونتاج الفيديوهات بسرعة...)'
                : 'Write your reel topic or draft script...'
            }
            className="w-full px-4 py-3 bg-[#0a0d16] border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500 transition-colors leading-relaxed placeholder:text-slate-500"
          />
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {isAr ? 'النبرة والأسلوب النفسي' : 'Tone & Psychological Hook Style'}
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0a0d16] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="حماسي وصادم">{isAr ? 'حماسي وصادم (Shock & High Energy)' : 'Shock & High Energy'}</option>
              <option value="استفزازي وتحدي">{isAr ? 'استفزازي ومخالف للسائد (Contrarian & Provocative)' : 'Contrarian & Provocative'}</option>
              <option value="فضول وغامض">{isAr ? 'فجوة فضول وغموض (Curiosity & Secret)' : 'Curiosity & Mystery'}</option>
              <option value="تعليمي سريع مكثف">{isAr ? 'قيمة سريعة مكثفة (Fast High-Value Tips)' : 'Fast High-Value Tips'}</option>
              <option value="قصصي درامي">{isAr ? 'تحول وقصة درامية (Story & Transformation)' : 'Story & Transformation'}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {isAr ? 'مدة الريلز المستهدفة' : 'Target Reel Duration'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: '15-30s', labelAr: '15-30 ث' },
                { id: '30-60s', labelAr: '30-60 ث (قياسي)' },
                { id: '60-90s', labelAr: '60-90 ث' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDuration(d.id)}
                  className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer text-center ${
                    duration === d.id
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                      : 'bg-[#0a0d16] text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {d.labelAr}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
          <span className="text-xs text-slate-400">
            {isAr
              ? 'سيتم توليد 5 سيناريوهات متخصصة في أول 3 ثواني مع تحليل نفسي لمعدل بقاء المشاهد'
              : 'Generates 5 tailored 3-second scenarios with psychological retention analysis'}
          </span>

          <button
            onClick={handleGenerateHooks}
            disabled={isGenerating}
            className="w-full sm:w-auto px-7 py-3 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>
              {isGenerating
                ? isAr
                  ? 'جاري ابتكار الهوكات الفيروسية...'
                  : 'Generating Viral Hooks...'
                : isAr
                ? 'ابتكار 5 سيناريوهات هوك وتحليل الاحتفاظ'
                : 'Generate 5 Hooks & Retention'}
            </span>
          </button>
        </div>
      </div>

      {/* RESULTS DISPLAY */}
      {data && (
        <div className="space-y-8 animate-fadeIn">
          {/* SECTION 1: AUDIENCE RETENTION METRICS BAR */}
          {data.retention && (
            <div className="p-6 bg-gradient-to-r from-[#11192e] via-[#101525] to-[#0c101c] border border-slate-800 rounded-2xl shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isAr ? 'تحليل معدل الاحتفاظ بالجمهور (Audience Retention)' : 'Audience Retention Analysis'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {isAr
                        ? 'تنبؤ خوارزمي باحتمالية إكمال المشاهد للفيديو وتفادي نقطة الهبوط الحرجة'
                        : 'Algorithmic prediction of viewer watch-time and drop-off prevention'}
                    </p>
                  </div>
                </div>

                {/* Score Pills */}
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      {isAr ? 'قوة أول 3 ثواني' : 'First 3s Power'}
                    </span>
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {data.retention.first3SecPower}%
                    </span>
                  </div>

                  <div className="px-4 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      {isAr ? 'الاحتفاظ الكلي' : 'Overall Retention'}
                    </span>
                    <span className="text-lg font-black text-emerald-400 font-mono">
                      {data.retention.overallScore}/100
                    </span>
                  </div>

                  <div className="px-3.5 py-2 bg-slate-900/90 border border-slate-700 rounded-xl text-center">
                    <span className="text-[10px] text-slate-400 block mb-0.5">
                      {isAr ? 'خطر الهبوط' : 'Drop-off Risk'}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        data.retention.dropOffRisk === 'low'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : data.retention.dropOffRisk === 'medium'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {data.retention.dropOffRisk === 'low'
                        ? isAr
                          ? 'منخفض (ممتاز)'
                          : 'Low'
                        : data.retention.dropOffRisk === 'medium'
                        ? isAr
                          ? 'متوسط'
                          : 'Medium'
                        : isAr
                        ? 'مرتفع'
                        : 'High'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Drop-off Explanation */}
              <div className="p-3.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-300 leading-relaxed">
                <span className="font-bold text-amber-300 ml-1.5">
                  {isAr ? 'نقطة الهبوط الحرجة:' : 'Drop-off Insight:'}
                </span>
                <span>{data.retention.dropOffExplanation}</span>
              </div>

              {/* Golden Advice Chips */}
              {data.retention.goldenAdvice && data.retention.goldenAdvice.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    {isAr ? '3 نصائح ذهبية لمضاعفة وقت المشاهدة حتى النهاية:' : '3 Golden Retention Tips:'}
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {data.retention.goldenAdvice.map((tip, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#0d121f] border border-slate-800/80 rounded-xl text-xs text-slate-300 flex items-start gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: 5 HOOK SCENARIOS (0-3 SECONDS) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-purple-400" />
                  <span>
                    {isAr
                      ? '5 سيناريوهات هوك لبداية أول 3 ثواني (ضمان إيقاف التمرير)'
                      : '5 Hook Scenarios for First 3 Seconds'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isAr
                    ? 'كل سيناريو مصمم بزاوية نفسية مختلفة لتجربتها ومقارنتها'
                    : 'Each scenario utilizes a distinct psychological angle for viral retention'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {data.hooks.map((hook, index) => {
                const isSelectedForA = hookAId === hook.id;
                const isSelectedForB = hookBId === hook.id;

                return (
                  <div
                    key={hook.id || index}
                    className="p-5 bg-[#0f1523] border border-slate-800 hover:border-purple-500/50 rounded-2xl transition-all shadow-lg space-y-4"
                  >
                    {/* Top Row: Type Badge + Retention Meter */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-xs font-mono font-bold">
                          {index + 1}
                        </span>
                        <span className="text-xs font-bold text-purple-300 bg-purple-950/60 px-3 py-1 rounded-full border border-purple-800/40">
                          {hook.typeLabelAr || hook.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-slate-400">{isAr ? 'الاحتفاظ المتوقع:' : 'Retention:'}</span>
                          <span className="font-mono font-bold text-emerald-400">
                            {hook.retentionPrediction || 92}%
                          </span>
                        </div>

                        {/* A/B Selector Buttons */}
                        <div className="flex items-center gap-1 border-r border-slate-800 pr-3 mr-1">
                          <button
                            onClick={() => setHookAId(hook.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                              isSelectedForA
                                ? 'bg-blue-600 text-white border-blue-400'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            {isAr ? 'هوك A' : 'Hook A'}
                          </button>
                          <button
                            onClick={() => setHookBId(hook.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                              isSelectedForB
                                ? 'bg-amber-600 text-white border-amber-400'
                                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            {isAr ? 'هوك B' : 'Hook B'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Spoken Hook Line */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>{isAr ? 'الكلام المنطوق (Voiceover في أول 3 ثواني):' : 'Spoken Voiceover (0-3s):'}</span>
                        </span>

                        <button
                          onClick={() => handleCopy(hook.spokenHook, `hook_${hook.id}`)}
                          className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedIndex === `hook_${hook.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">{isAr ? 'تم النسخ' : 'Copied'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{isAr ? 'نسخ الهوك' : 'Copy'}</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3.5 bg-[#0a0d16] border border-slate-800 rounded-xl">
                        <p className="text-sm font-bold text-white leading-relaxed">
                          "{hook.spokenHook}"
                        </p>
                      </div>
                    </div>

                    {/* Lower Grid: Screen Text + Visual Movement + SFX */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* On-screen text */}
                      <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                          <Tv className="w-3 h-3" />
                          <span>{isAr ? 'النص البصري على الشاشة:' : 'On-Screen Bold Text:'}</span>
                        </span>
                        <p className="font-extrabold text-white text-xs leading-snug">
                          {hook.screenText}
                        </p>
                      </div>

                      {/* Visual & camera direction */}
                      <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{isAr ? 'حركة الكاميرا والجسد:' : 'Camera & Body Visuals:'}</span>
                        </span>
                        <p className="text-slate-300 text-[11px] leading-snug">
                          {hook.visualDirection}
                        </p>
                      </div>

                      {/* Sound effect */}
                      <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          <span>{isAr ? 'المؤثر الصوتي المقترح:' : 'Recommended SFX:'}</span>
                        </span>
                        <p className="text-emerald-300 font-mono text-xs font-semibold">
                          {hook.sfx}
                        </p>
                      </div>
                    </div>

                    {/* Psychological Rationale */}
                    {hook.rationale && (
                      <p className="text-[11px] text-slate-400 italic bg-purple-950/20 px-3 py-1.5 rounded-lg border border-purple-900/20">
                        <strong className="text-purple-300 font-semibold">{isAr ? 'السر النفسي:' : 'Why it works:'}</strong>{' '}
                        {hook.rationale}
                      </p>
                    )}

                    {/* Quick Action to send to Reels Script Maker */}
                    {onSendToReelsScript && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => onSendToReelsScript(hook.spokenHook)}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isAr ? 'استخدام هذا الهوك لإنشاء سكريبت ريلز كامل' : 'Use this hook in Reels Script Maker'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: INTERACTIVE A/B TEST SIMULATOR */}
          <div className="p-6 bg-[#0f1523] border border-slate-800 rounded-2xl shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Swords className="w-5 h-5 text-amber-400" />
                  <span>{isAr ? 'محاكي اختبار A/B التنافسي للهوكات' : 'Interactive Hook A/B Test Simulator'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'اختر هوكين للمقارنة الخوارزمية وتحديد أيهما سيفوز في إيقاف التمرير'
                    : 'Select two hooks to simulate algorithm & viewer retention battle'}
                </p>
              </div>

              <button
                onClick={handleRunABTest}
                disabled={isComparingAB}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow"
              >
                {isComparingAB ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Swords className="w-3.5 h-3.5" />
                )}
                <span>{isAr ? 'بدء معركة A/B الآن' : 'Run A/B Battle'}</span>
              </button>
            </div>

            {/* A/B Visual Battle Arena */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hook A Card */}
              {(() => {
                const hookA = data.hooks.find((h) => h.id === hookAId) || data.hooks[0];
                const isWinner = abResult?.winner === 'A';
                return (
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isWinner
                        ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-[#0a0d16] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-blue-400 px-2.5 py-0.5 rounded bg-blue-950 border border-blue-800">
                        {isAr ? 'الهوك (A)' : 'Hook A'} #{hookA.id}
                      </span>
                      {abResult && (
                        <span className="text-sm font-mono font-black text-blue-300">
                          {abResult.hookAScore}/100
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white mb-2 leading-relaxed">
                      "{hookA.spokenHook}"
                    </p>
                    <span className="text-[11px] text-slate-400 block">
                      {hookA.typeLabelAr}
                    </span>
                    {isWinner && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-xs font-bold text-emerald-300">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isAr ? 'الهوك الفائز خوارزمياً!' : 'Winning Hook!'}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Hook B Card */}
              {(() => {
                const hookB = data.hooks.find((h) => h.id === hookBId) || data.hooks[1] || data.hooks[0];
                const isWinner = abResult?.winner === 'B';
                return (
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      isWinner
                        ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                        : 'bg-[#0a0d16] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-400 px-2.5 py-0.5 rounded bg-amber-950 border border-amber-800">
                        {isAr ? 'الهوك (B)' : 'Hook B'} #{hookB.id}
                      </span>
                      {abResult && (
                        <span className="text-sm font-mono font-black text-amber-300">
                          {abResult.hookBScore}/100
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white mb-2 leading-relaxed">
                      "{hookB.spokenHook}"
                    </p>
                    <span className="text-[11px] text-slate-400 block">
                      {hookB.typeLabelAr}
                    </span>
                    {isWinner && (
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-xs font-bold text-emerald-300">
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isAr ? 'الهوك الفائز خوارزمياً!' : 'Winning Hook!'}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* A/B Insights Result Box */}
            {abResult && (
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-200">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <Award className="w-4 h-4" />
                  <span>
                    {isAr
                      ? `سبب فوق الهوك (${abResult.winner}):`
                      : `Why Hook (${abResult.winner}) Won:`}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {abResult.winnerReason}
                </p>
                {abResult.demographicInsight && (
                  <p className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <strong className="text-purple-300 font-semibold">{isAr ? 'شريحة الجمهور الأنسب:' : 'Demographic Match:'}</strong>{' '}
                    {abResult.demographicInsight}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SECTION 4: 1 MILLION VIEWS TITLES */}
          {data.titles && data.titles.length > 0 && (
            <div className="p-6 bg-[#0f1523] border border-slate-800 rounded-2xl shadow-xl space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  <span>{isAr ? 'صياغة عناوين بأسلوب المليون مشاهدة (1M Views Titles)' : '1 Million Views Titles'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'عناوين ذات CTR مرتفع محفزة نفسياً ومخصصة لغلاف الريلز والتيك توك'
                    : 'High CTR titles engineered with psychological click-triggers for cover text'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.titles.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#0a0d16] border border-slate-800 hover:border-amber-500/40 rounded-xl transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                          {t.triggerLabelAr || t.triggerType}
                        </span>
                        {t.estimatedCtr && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            CTR: {t.estimatedCtr}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white">
                        {t.title}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCopy(t.title, `title_${idx}`)}
                      className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      title={isAr ? 'نسخ العنوان' : 'Copy title'}
                    >
                      {copiedIndex === `title_${idx}` ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
