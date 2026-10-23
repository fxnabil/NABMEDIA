import React, { useState } from 'react';
import {
  Sparkles,
  Clapperboard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  Check,
  Download,
  Plus,
  Trash2,
  ArrowRight,
  RotateCcw,
  Clock,
  Video,
  Volume2,
  Tv,
  Radio,
  Sliders,
  Send,
  Save,
  Flame,
  ListChecks,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { ReelsScriptData, ReelsScriptScene } from '../types';
import { getApiHeaders, hasGeminiApiKey } from '../services/settings';
import { saveProject } from '../services/storage';

interface ReelsScriptMakerProps {
  lang: 'ar' | 'en';
  onSavedToProjects?: () => void;
  onSendToSmartCaptions?: (script: string) => void;
  onSendToViralHooks?: (topic: string) => void;
  onBackToDashboard?: () => void;
  onOpenSettings?: () => void;
  initialTopic?: string;
}

interface ScriptPointItem {
  id: number;
  title: string;
  detail: string;
  type?: string;
  selected: boolean;
}

export const ReelsScriptMaker: React.FC<ReelsScriptMakerProps> = ({
  lang,
  onSavedToProjects,
  onSendToSmartCaptions,
  onSendToViralHooks,
  onBackToDashboard,
  onOpenSettings,
  initialTopic = '',
}) => {
  const isAr = lang === 'ar';
  const hasKey = hasGeminiApiKey();

  // Wizard Step: 1 = Topic & Config, 2 = Points Checklist & Approval, 3 = Full Script
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Input params
  const [topic, setTopic] = useState<string>(
    initialTopic ||
      'أفضل 3 تطبيقات ذكاء اصطناعي سرية لتقطيع مونتاج الريلز في ثوانٍ'
  );
  const [targetAudience, setTargetAudience] = useState<string>('صناع المحتوى والمبتدئين في المونتاج');
  const [tone, setTone] = useState<string>('حماسي وسريع مع صدمة في البداية');
  const [durationSeconds, setDurationSeconds] = useState<number>(45);

  // Step 2: Researched Points & Interactive Approval Checklist
  const [researchSummary, setResearchSummary] = useState<string>('');
  const [pointsList, setPointsList] = useState<ScriptPointItem[]>([]);
  const [newPointInput, setNewPointInput] = useState<string>('');

  // Step 3: Script output
  const [scriptData, setScriptData] = useState<ReelsScriptData | null>(null);

  // Loading & Error states
  const [isLoadingPoints, setIsLoadingPoints] = useState<boolean>(false);
  const [isLoadingScript, setIsLoadingScript] = useState<boolean>(false);
  const [keyErrorMsg, setKeyErrorMsg] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // 1. Step 1 -> Step 2: Generate Bullet Points from Topic
  const handleGeneratePoints = async () => {
    setKeyErrorMsg('');
    setStatusMsg('');

    if (!topic.trim()) {
      setKeyErrorMsg(isAr ? 'يرجى كتابة موضوع الريلز أولاً.' : 'Please enter a reel topic.');
      return;
    }

    if (!hasGeminiApiKey()) {
      setKeyErrorMsg(
        isAr
          ? 'مطلوب إدخال مفتاح Gemini API الشخصي الخاص بك من صفحة الإعدادات لتشغيل الذكاء الاصطناعي. لن يتم استهلاك أي رصيد من المطور.'
          : 'Your personal Gemini API Key is required in Settings. Zero credits are consumed from the developer.'
      );
      return;
    }

    setIsLoadingPoints(true);

    try {
      const res = await fetch('/api/generate-script-points', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          topic: topic.trim(),
          targetAudience,
          tone,
          durationSeconds,
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
        setIsLoadingPoints(false);
        return;
      }

      if (json.data && json.data.points) {
        setResearchSummary(json.data.researchSummary || '');
        const formatted: ScriptPointItem[] = json.data.points.map((p: any, idx: number) => ({
          id: p.id || idx + 1,
          title: p.title || `النقطة ${idx + 1}`,
          detail: p.detail || p.title || '',
          type: p.type || 'نقطة جوهرية',
          selected: true, // Default all selected
        }));
        setPointsList(formatted);
        setCurrentStep(2);
        setStatusMsg(
          isAr
            ? 'تم استخراج نقاط الريلز الذهبية! راجعها، عدلها، أو أضف عليها، ثم اضغط موافقة لإنشاء السكريبت.'
            : 'Reel key points generated! Review, edit, and approve to build the script.'
        );
      } else {
        throw new Error(json.message || 'Invalid response');
      }
    } catch (err: any) {
      setKeyErrorMsg(
        err?.message ||
          (isAr
            ? 'حدث خطأ أثناء استخراج نقاط السكريبت. تحقق من المفتاح في الإعدادات.'
            : 'Error extracting points with your Gemini key.')
      );
    } finally {
      setIsLoadingPoints(false);
    }
  };

  // 2. Step 2 Management: Toggle point selection
  const handleTogglePoint = (id: number) => {
    setPointsList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  // Edit Point Text
  const handleEditPointDetail = (id: number, newDetail: string) => {
    setPointsList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, detail: newDetail } : p))
    );
  };

  // Remove Point
  const handleRemovePoint = (id: number) => {
    setPointsList((prev) => prev.filter((p) => p.id !== id));
  };

  // Add custom point
  const handleAddCustomPoint = () => {
    if (!newPointInput.trim()) return;
    const newId = pointsList.length > 0 ? Math.max(...pointsList.map((p) => p.id)) + 1 : 1;
    setPointsList((prev) => [
      ...prev,
      {
        id: newId,
        title: isAr ? 'نقطة مخصصة إضافية' : 'Custom point',
        detail: newPointInput.trim(),
        type: isAr ? 'إضافة يدوية من المستخدم' : 'User Custom',
        selected: true,
      },
    ]);
    setNewPointInput('');
  };

  // 3. Step 2 -> Step 3: Approve & Generate Full Production Script
  const handleApproveAndGenerateScript = async () => {
    setKeyErrorMsg('');
    setStatusMsg('');

    const approved = pointsList.filter((p) => p.selected).map((p) => p.detail);

    if (approved.length === 0) {
      setKeyErrorMsg(
        isAr ? 'يرجى تحديد نقطة واحدة على الأقل للموافقة عليها.' : 'Please select at least one point to approve.'
      );
      return;
    }

    setIsLoadingScript(true);

    try {
      const res = await fetch('/api/generate-reels-script', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          topic,
          targetAudience,
          tone,
          durationSeconds,
          approvedPoints: approved,
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
        setIsLoadingScript(false);
        return;
      }

      if (json.data && json.data.scenes) {
        const payload: ReelsScriptData = {
          topic,
          targetAudience,
          tone,
          durationSeconds,
          approvedPoints: approved,
          scenes: json.data.scenes,
          estimatedTotalWords: json.data.estimatedTotalWords || 120,
          callToAction: json.data.callToAction || '',
        };
        setScriptData(payload);
        setCurrentStep(3);
        setStatusMsg(
          isAr
            ? 'تم إنشاء سكريبت الريلز الإنتاجي الكامل بنجاح وفق النقاط المعتمدة!'
            : 'Full Reels production script generated successfully from approved points!'
        );
      } else {
        throw new Error(json.message || 'Invalid script response');
      }
    } catch (err: any) {
      setKeyErrorMsg(
        err?.message ||
          (isAr
            ? 'حدث خطأ أثناء إنشاء السكريبت النهائي.'
            : 'Error generating final script.')
      );
    } finally {
      setIsLoadingScript(false);
    }
  };

  // Helpers: Full text format of script
  const getFullScriptPlainText = () => {
    if (!scriptData) return '';
    let out = `🎬 سكريبت ريلز احترافي - NABMEDIA STUDIO\n`;
    out += `الموضوع: ${scriptData.topic}\nالمدة المستهدفة: ${scriptData.durationSeconds} ثانية | النبرة: ${scriptData.tone}\n\n`;
    out += `--- المشاهد المتسلسلة ---\n\n`;

    scriptData.scenes.forEach((s) => {
      out += `[المشهد ${s.sceneNumber} (${s.timeRange})]\n`;
      out += `🎥 اللقطة وحركة الكاميرا: ${s.cameraAndVisual}\n`;
      out += `🎙️ الفويس أوفر (الكلام): ${s.voiceover}\n`;
      out += `📱 النص على الشاشة: ${s.screenText}\n`;
      out += `🔊 المؤثر الصوتي: ${s.sfx}\n\n`;
    });

    if (scriptData.callToAction) {
      out += `🚀 الدعوة للتفاعل (CTA): ${scriptData.callToAction}\n`;
    }
    return out;
  };

  const handleCopyFullScript = () => {
    const text = getFullScriptPlainText();
    navigator.clipboard.writeText(text);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = getFullScriptPlainText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reels_script_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToProjects = () => {
    if (!scriptData) return;
    saveProject({
      title: `سكريبت ريلز: ${topic.slice(0, 30)}...`,
      toolType: 'reels_scripts',
      summary: `سكريبت إنتاج كامل لـ ${durationSeconds} ثانية | ${scriptData.scenes.length} مشاهد | ${scriptData.approvedPoints.length} نقاط معتمدة`,
      data: scriptData,
    });
    setIsSaved(true);
    onSavedToProjects?.();
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSendToCaptions = () => {
    if (!scriptData) return;
    const allVoiceover = scriptData.scenes.map((s) => s.voiceover).join(' ');
    onSendToSmartCaptions?.(allVoiceover);
  };

  return (
    <div className="space-y-8 text-right font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 rounded-full text-xs text-purple-300 font-medium mb-2">
            <Clapperboard className="w-3.5 h-3.5 text-purple-400" />
            <span>{isAr ? 'مخصص حصراً لفيديوهات الريلز والـ Shorts' : 'Dedicated Reels & Shorts Script Maker'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Video className="w-6 h-6 text-purple-400" />
            <span>{isAr ? 'صانع سكريبتات الريلز التفاعلي' : 'Interactive Reels Script Generator'}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl">
            {isAr
              ? 'سير عمل ذكي: إدخال الموضوع -> بحث واستخراج النقاط الذهبية -> موافقة وتعديل المستخدم على النقاط -> بناء سكريبت إنتاجي متكامل مع حركة الكاميرا والنص البصري والمؤثرات الصوتية.'
              : 'Smart multi-step workflow: Enter topic -> AI researches key points -> User reviews & approves -> Generate full production script.'}
          </p>
        </div>

        {scriptData && (
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

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div
          onClick={() => setCurrentStep(1)}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
            currentStep === 1
              ? 'bg-purple-950/50 border-purple-500 ring-2 ring-purple-500/20 text-white'
              : 'bg-[#0f1523] border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 1
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            1
          </span>
          <div>
            <span className="text-xs font-bold block">
              {isAr ? 'الموضوع والهدف' : 'Topic & Setup'}
            </span>
            <span className="text-[10px] text-slate-500">
              {isAr ? 'تحديد الزاوية والمدة' : 'Strategy & Duration'}
            </span>
          </div>
        </div>

        <div
          onClick={() => pointsList.length > 0 && setCurrentStep(2)}
          className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
            pointsList.length > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
          } ${
            currentStep === 2
              ? 'bg-indigo-950/50 border-indigo-500 ring-2 ring-indigo-500/20 text-white'
              : 'bg-[#0f1523] border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 2
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            2
          </span>
          <div>
            <span className="text-xs font-bold block">
              {isAr ? 'اعتماد النقاط الذهبية' : 'Review & Approve'}
            </span>
            <span className="text-[10px] text-slate-500">
              {isAr ? 'تدقيق وموافقة المستخدم' : 'User Approval'}
            </span>
          </div>
        </div>

        <div
          onClick={() => scriptData && setCurrentStep(3)}
          className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
            scriptData ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
          } ${
            currentStep === 3
              ? 'bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 text-white'
              : 'bg-[#0f1523] border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
              currentStep === 3
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            3
          </span>
          <div>
            <span className="text-xs font-bold block">
              {isAr ? 'السكريبت الإنتاجي الكامل' : 'Full Script'}
            </span>
            <span className="text-[10px] text-slate-500">
              {isAr ? 'المشاهد وحركات الكاميرا' : 'Scenes & Visuals'}
            </span>
          </div>
        </div>
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
                  ? 'صانع السكريبتات يعتمد حصراً على مفتاحك الشخصي المجاني لحماية رصيد المطور 100% بدون أي تكلفة عليك.'
                  : 'The script maker operates exclusively via your personal key.'}
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

      {/* Error / Alert Display */}
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

      {/* Status banner */}
      {statusMsg && !keyErrorMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* ================= STEP 1: TOPIC & CONFIG ================= */}
      {currentStep === 1 && (
        <div className="p-6 bg-[#0f1523] border border-slate-800 rounded-2xl shadow-xl space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-purple-400" />
              <span>{isAr ? 'موضوع أو فكرة الريلز' : 'Reel Topic or Idea'}</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب الموضوع بدقة (مثال: أسرار المونتاج السريع بـ Premiere، كيف تزيد مشاهدات التيك توك...)'
                  : 'Enter topic...'
              }
              className="w-full px-4 py-3 bg-[#0a0d16] border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isAr ? 'الجمهور المستهدف' : 'Target Audience'}
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder={isAr ? 'مثال: المبتدئين، رواد الأعمال...' : 'Target Audience'}
                className="w-full px-3.5 py-2.5 bg-[#0a0d16] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Tone of voice */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {isAr ? 'نبرة الإلقاء' : 'Tone'}
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0a0d16] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="حماسي وسريع مع صدمة في البداية">
                  {isAr ? 'حماسي وسريع مع صدمة (High Energy)' : 'High Energy'}
                </option>
                <option value="تعليمي تطبيقي ومقنع">
                  {isAr ? 'تعليمي تطبيقي وخطوات عملية' : 'Educational & Step-by-Step'}
                </option>
                <option value="استفزازي وكسر للأخطاء الشائعة">
                  {isAr ? 'استفزازي وتصحيح خرافات' : 'Mythbusting & Provocative'}
                </option>
                <option value="قصصي وتشويقي">
                  {isAr ? 'قصصي مشوق وتجربة شخصية' : 'Storytelling'}
                </option>
              </select>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAr ? 'مدة الريلز' : 'Duration'}</span>
                </label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {durationSeconds} {isAr ? 'ثانية' : 'sec'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { sec: 30, label: '30 ث' },
                  { sec: 45, label: '45 ث' },
                  { sec: 60, label: '60 ث' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => setDurationSeconds(item.sec)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      durationSeconds === item.sec
                        ? 'bg-purple-600 text-white border-purple-400'
                        : 'bg-[#0a0d16] text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800/80">
            <span className="text-xs text-slate-400">
              {isAr
                ? 'المرحلة 1 من 3: سيقوم الذكاء الاصطناعي بدراسة الموضوع واستخراج النقاط الذهبية لتوافق عليها'
                : 'Step 1 of 3: AI will research topic and extract key points for your approval'}
            </span>

            <button
              onClick={handleGeneratePoints}
              disabled={isLoadingPoints}
              className="w-full sm:w-auto px-7 py-3 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoadingPoints ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <ListChecks className="w-4 h-4 text-amber-300" />
              )}
              <span>
                {isLoadingPoints
                  ? isAr
                    ? 'جاري البحث واستخراج النقاط...'
                    : 'Researching...'
                  : isAr
                  ? 'بحث واستخراج النقاط الذهبية للريلز'
                  : 'Research Key Points'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 2: POINTS REVIEW & APPROVAL ================= */}
      {currentStep === 2 && (
        <div className="p-6 bg-[#0f1523] border border-slate-800 rounded-2xl shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs text-indigo-300 font-bold mb-1.5">
                <ListChecks className="w-3.5 h-3.5" />
                <span>{isAr ? 'المرحلة 2: تدقيق وموافقة المستخدم' : 'Step 2: User Review & Approval'}</span>
              </div>
              <h3 className="text-base font-bold text-white">
                {isAr ? 'النقاط الذهبية المقترحة للريلز' : 'Researched Golden Points'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? 'راجع النقاط أدناه: حدد ما تريد اعتماده (Check/Uncheck)، عدل أي نص مباشرة، أو أضف نقاطك الخاصة'
                  : 'Select, edit, or add points. When ready, click approve to build the full script.'}
              </p>
            </div>

            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'تعديل الموضوع والمدة' : 'Edit Setup'}</span>
            </button>
          </div>

          {/* Research summary card */}
          {researchSummary && (
            <div className="p-4 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-xs text-indigo-200 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-indigo-300 font-bold mb-0.5">
                  {isAr ? 'زاوية الطرح المقترحة خوارزمياً:' : 'Viral Angle:'}
                </strong>
                <span>{researchSummary}</span>
              </div>
            </div>
          )}

          {/* Checklist of points */}
          <div className="space-y-3">
            {pointsList.map((p, index) => (
              <div
                key={p.id}
                className={`p-4 rounded-xl border transition-all ${
                  p.selected
                    ? 'bg-[#0a0d16] border-purple-500/60 ring-1 ring-purple-500/20'
                    : 'bg-slate-900/40 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={p.selected}
                    onChange={() => handleTogglePoint(p.id)}
                    className="w-4 h-4 mt-1 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600 shrink-0"
                  />

                  {/* Body with editable text */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{index + 1}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {p.title}
                        </span>
                        {p.type && (
                          <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/40">
                            {p.type}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleRemovePoint(p.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        title={isAr ? 'حذف هذه النقطة' : 'Delete point'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <textarea
                      value={p.detail}
                      onChange={(e) => handleEditPointDetail(p.id, e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add custom point input */}
          <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span>{isAr ? 'إضافة فكرة أو معلومة مخصصة تريد تضمينها في السكريبت:' : 'Add Custom Point:'}</span>
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPointInput}
                onChange={(e) => setNewPointInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomPoint()}
                placeholder={isAr ? 'اكتب نقطتك هنا واضغط إضافة...' : 'Type point and add...'}
                className="flex-1 px-3.5 py-2 bg-[#0a0d16] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={handleAddCustomPoint}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0"
              >
                {isAr ? 'إضافة النقطة' : 'Add Point'}
              </button>
            </div>
          </div>

          {/* User Approval Bar */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              {isAr
                ? `النقاط المعتمدة حالياً: ${pointsList.filter((p) => p.selected).length} من ${pointsList.length}`
                : `Approved points: ${pointsList.filter((p) => p.selected).length} of ${pointsList.length}`}
            </span>

            <button
              onClick={handleApproveAndGenerateScript}
              disabled={isLoadingScript}
              className="w-full sm:w-auto px-8 py-3.5 text-xs font-black text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoadingScript ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {isLoadingScript
                  ? isAr
                    ? 'جاري تأليف سكريبت الريلز الاحترافي...'
                    : 'Writing Reels Script...'
                  : isAr
                  ? 'موافقة على النقاط واعتماد السكريبت الكامل'
                  : 'Approve & Build Full Reels Script'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ================= STEP 3: FULL PRODUCTION SCRIPT ================= */}
      {currentStep === 3 && scriptData && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="p-4 bg-[#0f1523] border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {isAr ? 'السكريبت الإنتاجي المعتمد جاهز للتصوير والمونتاج!' : 'Production Script Ready'}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {scriptData.scenes.length} {isAr ? 'مشاهد' : 'scenes'} · {scriptData.durationSeconds}s · ~{scriptData.estimatedTotalWords} {isAr ? 'كلمة' : 'words'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyFullScript}
                className="px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? (isAr ? 'تم النسخ!' : 'Copied!') : isAr ? 'نسخ السكريبت' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadTxt}
                className="px-3.5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تنزيل .TXT' : 'Download TXT'}</span>
              </button>

              {onSendToSmartCaptions && (
                <button
                  onClick={handleSendToCaptions}
                  className="px-4 py-2 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>{isAr ? 'توليد كابتشن هورموزي فوري' : 'Send to Captions'}</span>
                </button>
              )}

              <button
                onClick={() => setCurrentStep(2)}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
              >
                <span>{isAr ? 'تعديل النقاط' : 'Edit Points'}</span>
              </button>
            </div>
          </div>

          {/* Scenes Cards Container */}
          <div className="space-y-4">
            {scriptData.scenes.map((scene) => (
              <div
                key={scene.sceneNumber}
                className="p-5 bg-[#0f1523] border border-slate-800 hover:border-purple-500/50 rounded-2xl transition-all shadow-md space-y-4"
              >
                {/* Scene Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-xs font-mono font-bold">
                      {scene.sceneNumber}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {isAr ? `المشهد ${scene.sceneNumber}` : `Scene ${scene.sceneNumber}`}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-800/40">
                    ⏱️ {scene.timeRange}
                  </span>
                </div>

                {/* Voiceover Speech Box */}
                <div className="p-4 bg-[#0a0d16] border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isAr ? 'الكلام المنطوق (Voiceover):' : 'Spoken Voiceover:'}</span>
                  </span>
                  <p className="text-sm font-bold text-white leading-relaxed">
                    "{scene.voiceover}"
                  </p>
                </div>

                {/* 3 Columns: Visuals, Screen Text, SFX */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  {/* Camera & Visual Direction */}
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>{isAr ? 'حركة الكاميرا واللقطة:' : 'Camera & Visual Direction:'}</span>
                    </span>
                    <p className="text-slate-300 text-xs leading-snug">
                      {scene.cameraAndVisual}
                    </p>
                  </div>

                  {/* On-Screen Text */}
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Tv className="w-3 h-3" />
                      <span>{isAr ? 'النص البصري على الشاشة:' : 'On-Screen Bold Text:'}</span>
                    </span>
                    <p className="font-extrabold text-white text-xs leading-snug">
                      {scene.screenText}
                    </p>
                  </div>

                  {/* Sound Effect & Transition */}
                  <div className="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      <span>{isAr ? 'المؤثر الصوتي والانتقال:' : 'SFX & Transition:'}</span>
                    </span>
                    <p className="text-emerald-300 font-mono text-xs font-semibold">
                      {scene.sfx}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Call to action card */}
          {scriptData.callToAction && (
            <div className="p-4 bg-gradient-to-r from-purple-950/40 to-indigo-950/40 border border-purple-800/50 rounded-2xl flex items-center gap-3 text-xs text-purple-200">
              <Flame className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="font-bold text-white block mb-0.5">
                  {isAr ? 'الدعوة الختامية للتفاعل وحفظ الفيديو (CTA):' : 'Closing Call to Action (CTA):'}
                </strong>
                <span>{scriptData.callToAction}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
