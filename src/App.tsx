import React, { useState, useEffect } from 'react';
import {
  Scissors,
  FileText,
  Languages,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  Zap,
  Menu,
  ArrowLeft,
  Settings as SettingsIcon,
  Film,
  Flame,
  Clapperboard,
} from 'lucide-react';

import { ActivationData, ProjectRecord } from './types';
import { getActivationState, logoutActivation, DEFAULT_TELEGRAM_CHANNEL } from './services/activation';
import { getPreviousProjects } from './services/storage';

import { Sidebar } from './components/Sidebar';
import { ActivationModal } from './components/ActivationModal';
import { SilenceRemover } from './components/SilenceRemover';
import { SmartCaptions } from './components/SmartCaptions';
import { SubtitleTranslator } from './components/SubtitleTranslator';
import { FutureToolkit } from './components/FutureToolkit';
import { PreviousProjects } from './components/PreviousProjects';
import { Settings } from './components/Settings';
import { ViralHooksGenerator } from './components/ViralHooksGenerator';
import { ReelsScriptMaker } from './components/ReelsScriptMaker';

const HERO_IMAGE_URL = '/src/assets/images/editsclups_hero_editor_1792672795586.jpg';

export type ToolView =
  | 'dashboard'
  | 'viral_hooks'
  | 'reels_scripts'
  | 'silence_remover'
  | 'smart_captions'
  | 'subtitle_translator'
  | 'projects'
  | 'settings';

export default function App() {
  const [activation, setActivation] = useState<ActivationData | null>(null);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState<ToolView>('dashboard');
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [captionsInitialSrt, setCaptionsInitialSrt] = useState<string>('');
  const [captionsInitialText, setCaptionsInitialText] = useState<string>('');
  const [reelsScriptInitialTopic, setReelsScriptInitialTopic] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const isAr = lang === 'ar';

  useEffect(() => {
    const saved = getActivationState();
    if (saved && saved.isActivated) {
      setActivation(saved);
      setIsActivationModalOpen(false);
    } else {
      setIsActivationModalOpen(true);
    }

    setProjects(getPreviousProjects());
  }, []);

  const handleActivated = (data: ActivationData) => {
    setActivation(data);
    setIsActivationModalOpen(false);
  };

  const handleLogout = () => {
    logoutActivation();
    setActivation(null);
    setIsActivationModalOpen(true);
    setCurrentView('dashboard');
  };

  const refreshProjects = () => {
    setProjects(getPreviousProjects());
  };

  const handleOpenProject = (project: ProjectRecord) => {
    if (project.toolType === 'silence_remover') {
      setCurrentView('silence_remover');
    } else if (project.toolType === 'smart_captions') {
      if (project.data?.srtContent) {
        setCaptionsInitialSrt(project.data.srtContent);
      }
      setCurrentView('smart_captions');
    } else if (project.toolType === 'subtitle_translator') {
      setCurrentView('subtitle_translator');
    } else if (project.toolType === 'viral_hooks') {
      setCurrentView('viral_hooks');
    } else if (project.toolType === 'reels_scripts') {
      setCurrentView('reels_scripts');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendToSmartCaptions = (srt: string) => {
    setCaptionsInitialSrt(srt);
    setCurrentView('smart_captions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendTextToCaptions = (text: string) => {
    setCaptionsInitialText(text);
    setCurrentView('smart_captions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSendToReelsScript = (topicStr: string) => {
    setReelsScriptInitialTopic(topicStr);
    setCurrentView('reels_scripts');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };


  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col lg:flex-row font-sans"
    >
      {/* 1. Mandatory Activation Modal */}
      <ActivationModal
        isOpen={isActivationModalOpen || !activation?.isActivated}
        onActivated={handleActivated}
      />

      {/* 2. Side Navigation Bar (القائمة الرئيسية الجانبية) */}
      <Sidebar
        activeTab={currentView}
        setActiveTab={(tab) => setCurrentView(tab as ToolView)}
        activation={activation}
        onLogout={handleLogout}
        lang={lang}
        setLang={setLang}
        isOpenMobile={isMobileMenuOpen}
        setIsOpenMobile={setIsMobileMenuOpen}
      />

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header (Hamburger trigger & Quick Brand) */}
        <header className="lg:hidden sticky top-0 z-20 bg-[#0d121f]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-slate-300 hover:text-white bg-slate-800/80 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white">
                <Film className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm tracking-wide text-white">
                NABMEDIA STUDIO
              </span>
            </div>
          </div>

          <button
            onClick={() => setCurrentView('settings')}
            className={`p-2 rounded-xl border transition-colors ${
              currentView === 'settings'
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title={isAr ? 'الإعدادات' : 'Settings'}
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
          {/* CASE 1: INDIVIDUAL FOCUSED TOOL VIEW (Opens Alone in the Window!) */}
          {currentView === 'viral_hooks' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isAr ? 'العودة للوحة الأدوات الرئيسية' : 'Return to Dashboard'}</span>
              </button>

              <ViralHooksGenerator
                lang={lang}
                onSavedToProjects={refreshProjects}
                onSendToReelsScript={handleSendToReelsScript}
                onSendToSmartCaptions={handleSendTextToCaptions}
                onBackToDashboard={() => setCurrentView('dashboard')}
                onOpenSettings={() => setCurrentView('settings')}
              />
            </div>
          )}

          {currentView === 'reels_scripts' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isAr ? 'العودة للوحة الأدوات الرئيسية' : 'Return to Dashboard'}</span>
              </button>

              <ReelsScriptMaker
                lang={lang}
                initialTopic={reelsScriptInitialTopic}
                onSavedToProjects={refreshProjects}
                onSendToSmartCaptions={handleSendTextToCaptions}
                onSendToViralHooks={(topicStr) => {
                  setCurrentView('viral_hooks');
                }}
                onBackToDashboard={() => setCurrentView('dashboard')}
                onOpenSettings={() => setCurrentView('settings')}
              />
            </div>
          )}

          {currentView === 'silence_remover' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isAr ? 'العودة للوحة الأدوات الرئيسية' : 'Return to Dashboard'}</span>
              </button>

              <SilenceRemover
                lang={lang}
                onSavedToProjects={refreshProjects}
                onBackToDashboard={() => setCurrentView('dashboard')}
              />
            </div>
          )}

          {currentView === 'smart_captions' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isAr ? 'العودة للوحة الأدوات الرئيسية' : 'Return to Dashboard'}</span>
              </button>

              <SmartCaptions
                lang={lang}
                initialSrt={captionsInitialSrt}
                initialScriptText={captionsInitialText}
                onSavedToProjects={refreshProjects}
                onBackToDashboard={() => setCurrentView('dashboard')}
                onOpenSettings={() => setCurrentView('settings')}
                onSendToViralHooks={(topicStr) => setCurrentView('viral_hooks')}
                onSendToReelsScript={(topicStr) => handleSendToReelsScript(topicStr)}
              />
            </div>
          )}


          {currentView === 'subtitle_translator' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isAr ? 'العودة للوحة الأدوات الرئيسية' : 'Return to Dashboard'}</span>
              </button>

              <SubtitleTranslator
                lang={lang}
                onSavedToProjects={refreshProjects}
                onSendToSmartCaptions={handleSendToSmartCaptions}
                onBackToDashboard={() => setCurrentView('dashboard')}
                onOpenSettings={() => setCurrentView('settings')}
              />
            </div>
          )}

          {currentView === 'projects' && (
            <div className="space-y-4">
              <button
                onClick={() => setCurrentView('dashboard')}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{isAr ? 'العودة للوحة الأدوات الرئيسية' : 'Return to Dashboard'}</span>
              </button>

              <PreviousProjects
                projects={projects}
                onRefreshProjects={refreshProjects}
                onOpenProject={handleOpenProject}
                lang={lang}
              />
            </div>
          )}

          {currentView === 'settings' && (
            <div className="space-y-4">
              <Settings
                activation={activation}
                onLogout={handleLogout}
                lang={lang}
                onBackToDashboard={() => setCurrentView('dashboard')}
              />
            </div>
          )}

          {/* CASE 2: MAIN DASHBOARD VIEW (Shown when no specific tool is opened) */}
          {currentView === 'dashboard' && (
            <>
              {/* Hero Banner Section */}
              <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-[#121826] via-[#101420] to-[#0d1017] p-6 sm:p-10 shadow-2xl">
                <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
                  <img
                    src={HERO_IMAGE_URL}
                    alt="NABMEDIA STUDIO Editing Suite"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="space-y-4 max-w-2xl text-right">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950/60 border border-emerald-800/50 rounded-full text-xs text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {isAr ? 'حساب مفعل بكود حصري:' : 'Active Key:'}{' '}
                        <strong className="font-mono text-white">
                          {activation?.code || 'NABMED-VIP-2026'}
                        </strong>
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-emerald-300 font-semibold">
                        {activation?.tier || 'VIP Creator Pro'}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                      NABMEDIA STUDIO
                      <span className="block text-lg sm:text-2xl font-bold text-purple-400 mt-1">
                        {isAr
                          ? 'منصة أدوات المونتاج الذكية لصناع الفيديوهات'
                          : 'Smart AI Video Editing Suite for Creators'}
                      </span>
                    </h1>

                    <p className="text-sm text-slate-300 leading-relaxed">
                      {isAr
                        ? 'أدوات مونتاج احترافية متقدمة عبر القائمة الجانبية: تقطيع السكتات بالتايم لاين، استخراج وتجزئة كابتشن SRT بلهجات متعددة، ترجمة الملفات، وتخصيص مفتاح Gemini API.'
                        : 'Professional editing suite with lateral navigation: timeline silence cutter, dialect smart captions, subtitle translator, and custom Gemini API settings.'}
                    </p>

                    {/* Direct Links */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <a
                        href={DEFAULT_TELEGRAM_CHANNEL}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="px-4 py-2.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-950/50 hover:bg-blue-900/60 border border-blue-800/50 rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 text-blue-400" />
                        <span>{isAr ? 'قناة التلجرام الرسمية لتجديد الأكواد' : 'Telegram Channel'}</span>
                      </a>

                      <button
                        onClick={() => setCurrentView('settings')}
                        className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <SettingsIcon className="w-3.5 h-3.5 text-purple-400" />
                        <span>{isAr ? 'إعدادات المنصة و Gemini API' : 'Settings & API'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Quick KPI Strip */}
                  <div className="w-full lg:w-72 grid grid-cols-2 lg:grid-cols-1 gap-3 shrink-0">
                    <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                      <span className="text-[11px] text-slate-400 block mb-0.5">
                        {isAr ? 'الأدوات النشطة' : 'Active Core Tools'}
                      </span>
                      <span className="text-xl font-bold text-emerald-400 font-mono">
                        5 {isAr ? 'أدوات ريلز ومونتاج' : 'Core Tools'}
                      </span>
                    </div>
                    <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                      <span className="text-[11px] text-slate-400 block mb-0.5">
                        {isAr ? 'المشاريع المحفوظة' : 'Saved Projects'}
                      </span>
                      <span className="text-xl font-bold text-purple-400 font-mono">
                        {projects.length} {isAr ? 'مشروع' : 'projects'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Core Tools Cards (Clicking opens tool ALONE in workspace) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span>
                      {isAr
                        ? 'أدوات الريلز والمونتاج المتكاملة (انقر لفتح أي أداة في نافذة العمل)'
                        : 'Reels & Editing Suite Tools (Click to Open)'}
                    </span>
                  </h2>

                  <button
                    onClick={() => {
                      const el = document.getElementById('future-toolkit-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isAr ? 'صندوق الأدوات المستقبلية' : 'View Future Toolkit'}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Card 1: Viral Hooks & Million-View Titles */}
                  <div
                    onClick={() => {
                      setCurrentView('viral_hooks');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group p-6 bg-gradient-to-br from-[#121829] to-[#0e1320] hover:border-amber-500 border border-slate-800 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-amber-500/10"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                        <Flame className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                        {isAr ? 'مولد الهوك والعناوين الفيروسية' : 'Viral Hooks & Titles Studio'}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isAr
                          ? '5 سيناريوهات هوك لأول 3 ثواني تضمن إيقاف التمرير، تحليل معدل الاحتفاظ بالجمهور، صياغة عناوين بأسلوب المليون مشاهدة، ومحاكي اختبار A/B التنافسي.'
                          : '5 hook scenarios for the first 3s, audience retention rate analysis, million-view titles, and interactive A/B testing.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-amber-400/80 font-mono text-[11px]">هوك 3ث + تحليل احتفاظ + A/B</span>
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <span>{isAr ? 'فتح الأداة' : 'Open'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Interactive Reels Script Maker */}
                  <div
                    onClick={() => {
                      setCurrentView('reels_scripts');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group p-6 bg-gradient-to-br from-[#131627] to-[#0e111d] hover:border-indigo-500 border border-slate-800 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-indigo-500/10"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-105 transition-transform">
                        <Clapperboard className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">
                        {isAr ? 'صانع سكريبتات الريلز التفاعلي' : 'Interactive Reels Script Maker'}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isAr
                          ? 'سير عمل احترافي: إدخال الموضوع -> بحث واستخراج النقاط الذهبية -> تدقيق وموافقة المستخدم -> بناء سكريبت كامل مع حركة الكاميرا والنص والمؤثرات.'
                          : 'Multi-step workflow: Research topic -> user reviews & approves points -> generate full scene-by-scene Reels production script.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-indigo-400/80 font-mono text-[11px]">موافقة المستخدم + مشاهد متسلسلة</span>
                      <span className="text-indigo-400 font-semibold flex items-center gap-1">
                        <span>{isAr ? 'فتح الأداة' : 'Open'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Card 3: Smart Captions SRT */}
                  <div
                    onClick={() => {
                      setCurrentView('smart_captions');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group p-6 bg-[#111827] hover:bg-[#151e30] border border-slate-800 hover:border-emerald-500 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-emerald-600/10"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2 group-hover:text-emerald-300 transition-colors">
                        {isAr ? 'كابتشن وتفريغ SRT الذكي' : 'Smart Captions SRT (Media & Dialect)'}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isAr
                          ? 'تفريغ ملفات الصوت والفيديو بذكاء Gemini مع فك الترميز بـ Web Audio، أو توليد كابتشن هورموزي فوري من نصوص السكريبت (3-5 كلمات).'
                          : 'Transcribe media files with 16kHz audio extraction or instant Hormozi-styled script-to-caption generator.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">تفريغ وسائط + توليد سكريبت</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span>{isAr ? 'فتح الأداة' : 'Open'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Silence Remover */}
                  <div
                    onClick={() => {
                      setCurrentView('silence_remover');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group p-6 bg-[#111827] hover:bg-[#151e30] border border-slate-800 hover:border-purple-500 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-purple-600/10"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                        <Scissors className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
                        {isAr ? 'تقطيع السكتات والتايم لاين' : 'Timeline Silence Remover'}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isAr
                          ? 'خطوات متسلسلة على التايم لاين: استيراد الملف، فحص الديسيبل، تقطيع وحذف السكتات تلقائياً، وتصدير الصوت النظيف و EDL.'
                          : 'Visual multi-track timeline cutter: places audio on timeline, cuts dead pauses, and exports ready WAV + EDL.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">تايم لاين و 4 خطوات</span>
                      <span className="text-purple-400 font-semibold flex items-center gap-1">
                        <span>{isAr ? 'فتح الأداة' : 'Open'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* Card 5: Subtitle Translator */}
                  <div
                    onClick={() => {
                      setCurrentView('subtitle_translator');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group p-6 bg-[#111827] hover:bg-[#151e30] border border-slate-800 hover:border-blue-500 rounded-2xl transition-all cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-blue-600/10"
                  >
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-105 transition-transform">
                        <Languages className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                        {isAr ? 'ترجمة الكابتشن والملفات' : 'Subtitle Translator'}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {isAr
                          ? 'ترجمة فورية متطابقة لملفات الكابتشن (.srt) إلى لغات متعددة مع الحفاظ الصارم على أرقام المقاطع وتوقيتات الظهور.'
                          : 'Translate .srt subtitles into multiple languages while strictly preserving timecodes and sequential indices.'}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-mono text-[11px]">حفظ التوقيتات والأرقام</span>
                      <span className="text-blue-400 font-semibold flex items-center gap-1">
                        <span>{isAr ? 'فتح الأداة' : 'Open'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Other Rows: Previous Projects (المشاريع السابقة) */}
              <section id="projects-section">
                <PreviousProjects
                  projects={projects}
                  onRefreshProjects={refreshProjects}
                  onOpenProject={handleOpenProject}
                  lang={lang}
                />
              </section>

              {/* Expandable Future Toolkit (صندوق الأدوات المستقبلية) */}
              <section id="future-toolkit-section">
                <FutureToolkit lang={lang} />
              </section>
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-[#080c14] py-8 text-center text-xs text-slate-500 mt-auto">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">NABMEDIA STUDIO</span>
              <span>·</span>
              <span>
                {isAr
                  ? 'منصة أدوات المونتاج الذكية لصناع المحتوى'
                  : 'Intelligent Editing Suite for Creators'}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <a
                href={DEFAULT_TELEGRAM_CHANNEL}
                target="_blank"
                rel="noreferrer noopener"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Send className="w-3 h-3" />
                <span>{isAr ? 'قناة التلجرام الرسمية' : 'Telegram Channel'}</span>
              </a>
              <span>·</span>
              <span>v3.0 Pro</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
