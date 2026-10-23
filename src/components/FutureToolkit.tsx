import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Mic,
  Maximize2,
  Volume2,
  Palette,
  ThumbsUp,
  Check,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { FutureTool } from '../types';

interface FutureToolkitProps {
  lang: 'ar' | 'en';
}

const FUTURE_TOOLS: FutureTool[] = [
  {
    id: 'upscaler',
    title: 'مطور جودة الفيديو 4K ووضوح الوجوه',
    titleEn: '4K AI Video Upscaler & Face Enhancer',
    description: 'ترقية جودة فيديوهات الريلز المنخفضة إلى 4K فائقة الوضوح مع استعادة تفاصيل البشرة والوجه دون ضوضاء.',
    category: 'Video Quality',
    status: 'in_development',
    votes: 482,
    features: ['ترقية دقة 1080p إلى 4K', 'تحسين ملامح الوجه بالذكاء الاصطناعي', 'تصدير 60fps فائق السلاسة'],
  },
  {
    id: 'vocal_splitter',
    title: 'عازل الصوت البشري وإزالة الضوضاء الخلفية',
    titleEn: 'AI Vocal & Background Noise Isolator',
    description: 'فصل صوت المتحدث عن الموسيقى التصويرية وضجيج الشارع والرياح بضغطة زر وبدون تشويش.',
    category: 'Audio Production',
    status: 'beta_testing',
    votes: 624,
    features: ['إزالة صدى الغرفة والضجيج', 'استخراج مسار صوت نقي منفصل', 'معايرة الـ De-Esser تلقائياً'],
  },
  {
    id: 'hook_generator',
    title: 'مولد الهوك والعناوين الفيروسية للريلز',
    titleEn: 'Viral Hook & Title Retention Generator',
    description: 'تحليل نص الفيديو واقتراح 5 سيناريوهات هوك لبداية أول 3 ثواني تضمن بقاء المشاهد حتى نهاية الفيديو.',
    category: 'Content Strategy',
    status: 'coming_soon',
    votes: 395,
    features: ['تحليل معدل الاحتفاظ بالجمهور', 'صياغة عناوين بأسلوب المليون مشاهدة', 'اختبار A/B للهوك المقترح'],
  },
  {
    id: 'reframer',
    title: 'إعادة التأطير الذكي (16:9 إلى 9:16)',
    titleEn: 'Smart 16:9 to 9:16 Auto Re-framer',
    description: 'تحويل الفيديوهات الأفقية إلى ريلز وشورتس عمودية مع تتبع ذكي للمتحدث وحفظ الحركة داخل الإطار.',
    category: 'Framing & Layout',
    status: 'in_development',
    votes: 512,
    features: ['تتبع الوجه والموضوع تلقائياً', 'إضافة خلفية ضبابية احترافية', 'دعم تقسيم الشاشة Split Screen'],
  },
  {
    id: 'sound_fx',
    title: 'مكتبة المؤثرات الصوتية للريلز (SFX Pack)',
    titleEn: 'Viral Reels Sound FX & Whooshes',
    description: 'أكثر من 500 صوت مؤثر احترافي (Whoosh, Pop, Ding, Risers, Bass Drops) مدمجة وجاهزة للمعاينة الفورية.',
    category: 'Sound Library',
    status: 'coming_soon',
    votes: 320,
    features: ['معاينة فورية بدون تحميل مسبق', 'تنزيل حزم كاملة متوافقة مع CapCut', 'تحديث أسبوعي بالأصوات الترند'],
  },
  {
    id: 'lut_grader',
    title: 'حزم تصحيح الألوان وفلاتر السينما (LUTs)',
    titleEn: 'Cinematic Color Grading & LUTs Exporter',
    description: 'فلاتر ألوان سينمائية معدة مسبقاً لمونتاج كاميرات الهاتف وكاميرات سوني وكانون بصيغة .CUBE المعتمدة.',
    category: 'Color Grading',
    status: 'in_development',
    votes: 278,
    features: ['معاينة الفلتر قبل وبعد على الفيديو', 'تصدير ملفات .cube القياسية', 'ألوان بشرة طبيعية غنية'],
  },
];

export const FutureToolkit: React.FC<FutureToolkitProps> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [votedTools, setVotedTools] = useState<Record<string, boolean>>({});
  const [tools, setTools] = useState<FutureTool[]>(FUTURE_TOOLS);

  const handleVote = (id: string) => {
    if (votedTools[id]) return;
    setVotedTools((prev) => ({ ...prev, [id]: true }));
    setTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, votes: t.votes + 1 } : t))
    );
  };

  return (
    <div id="future-toolkit" className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-7 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isAr ? 'صندوق الأدوات المستقبلية (Future Toolkit)' : 'Future Editing Toolkit'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'مساحة قابلة للتوسع والتطوير مستقبلاً لإضافة أدوات مونتاج إضافية تلبي كافة احتياجات صناع المحتوى'
                : 'Upcoming expansion tools engineered specifically for professional content creators'}
            </p>
          </div>
        </div>

        <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-3 py-1.5 rounded-lg border border-indigo-800/40 self-start sm:self-auto">
          {isAr ? 'قيد التطوير النشط' : 'Active Roadmap'}
        </span>
      </div>

      {/* Tools Grid */}
      <div className="my-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((tool) => {
          const hasVoted = votedTools[tool.id];
          return (
            <div
              key={tool.id}
              className="group p-5 bg-[#0d121d] hover:bg-[#111726] border border-slate-800 hover:border-slate-700 rounded-2xl transition-all flex flex-col justify-between"
            >
              <div>
                {/* Status and category */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="text-[11px] font-mono text-slate-400">{tool.category}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      tool.status === 'beta_testing'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                        : tool.status === 'in_development'
                        ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tool.status === 'beta_testing'
                      ? isAr ? 'تجربة بيتا' : 'Beta Test'
                      : tool.status === 'in_development'
                      ? isAr ? 'قيد البرمجة' : 'In Dev'
                      : isAr ? 'قريباً' : 'Planned'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                  {isAr ? tool.title : tool.titleEn}
                </h3>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {tool.description}
                </p>

                {/* Features list */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
                  {tool.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="w-1 h-1 rounded-full bg-purple-400" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vote CTA */}
              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {tool.votes} {isAr ? 'صوت' : 'votes'}
                </span>

                <button
                  onClick={() => handleVote(tool.id)}
                  disabled={hasVoted}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                    hasVoted
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {hasVoted ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isAr ? 'تم التصويت!' : 'Voted!'}</span>
                    </>
                  ) : (
                    <>
                      <ThumbsUp className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isAr ? 'صوت للأداة' : 'Vote'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
