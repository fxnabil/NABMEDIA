import React from 'react';
import {
  Film,
  Zap,
  Scissors,
  FileText,
  Languages,
  FolderKanban,
  Settings,
  Send,
  LogOut,
  ExternalLink,
  ShieldCheck,
  X,
  Sparkles,
  Flame,
  Clapperboard,
} from 'lucide-react';
import { ActivationData } from '../types';
import { DEFAULT_TELEGRAM_CHANNEL } from '../services/activation';
import { getGeminiApiKey } from '../services/settings';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activation: ActivationData | null;
  onLogout: () => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activation,
  onLogout,
  lang,
  setLang,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const isAr = lang === 'ar';
  const hasCustomApiKey = Boolean(getGeminiApiKey());

  const coreTools = [
    {
      id: 'dashboard',
      labelAr: 'لوحة الأدوات الرئيسية',
      labelEn: 'Main Dashboard',
      icon: Zap,
      badgeAr: 'الرئيسية',
      badgeEn: 'Home',
    },
    {
      id: 'viral_hooks',
      labelAr: 'مولد الهوك والعناوين الفيروسية',
      labelEn: 'Viral Hooks & Titles',
      icon: Flame,
      badgeAr: 'فيروسي 🔥',
      badgeEn: 'Viral 🔥',
    },
    {
      id: 'reels_scripts',
      labelAr: 'صانع سكريبتات الريلز',
      labelEn: 'Reels Script Maker',
      icon: Clapperboard,
      badgeAr: 'تفاعلي 🎬',
      badgeEn: 'Script 🎬',
    },
    {
      id: 'smart_captions',
      labelAr: 'كابتشن وتفريغ SRT الذكي',
      labelEn: 'Smart Captions SRT',
      icon: FileText,
      badgeAr: 'لهجات 🎙️',
      badgeEn: 'Dialects',
    },
    {
      id: 'silence_remover',
      labelAr: 'تقطيع السكتات والتايم لاين',
      labelEn: 'Silence Remover',
      icon: Scissors,
      badgeAr: 'تايم لاين',
      badgeEn: 'Timeline',
    },
    {
      id: 'subtitle_translator',
      labelAr: 'ترجمة الكابتشن والملفات',
      labelEn: 'Subtitle Translator',
      icon: Languages,
      badgeAr: 'توقيت دقيق',
      badgeEn: 'Accurate',
    },
    {
      id: 'projects',
      labelAr: 'المشاريع والتصديرات',
      labelEn: 'Saved Projects',
      icon: FolderKanban,
    },
  ];

  const systemTools = [
    {
      id: 'settings',
      labelAr: 'إعدادات المنصة و API',
      labelEn: 'Settings & Gemini API',
      icon: Settings,
      hasDot: hasCustomApiKey,
      badgeAr: hasCustomApiKey ? 'مفتاحك مفعّل' : 'مطلوب مفتاحك',
      badgeEn: hasCustomApiKey ? 'Key Active' : 'Key Needed',
    },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    setIsOpenMobile(false);
  };


  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0d121f] border-slate-800 text-right">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-purple-600/25 shrink-0">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-wide text-white font-sans">
                NABMEDIA
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                STUDIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isAr ? 'منصة المونتاج الذكية' : 'AI Video Editor Suite'}
            </p>
          </div>
        </div>

        {/* Close button on mobile */}
        <button
          onClick={() => setIsOpenMobile(false)}
          className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {isAr ? 'أدوات المونتاج والريلز' : 'Editing & Reels Tools'}
          </span>
          <nav className="space-y-1">
            {coreTools.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span>{isAr ? item.labelAr : item.labelEn}</span>
                  </div>

                  {item.badgeAr && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isAr ? item.badgeAr : item.badgeEn}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 block">
            {isAr ? 'الإعدادات والنظام' : 'Settings & AI'}
          </span>
          <nav className="space-y-1">
            {systemTools.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span>{isAr ? item.labelAr : item.labelEn}</span>
                  </div>

                  {item.badgeAr && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isAr ? item.badgeAr : item.badgeEn}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Telegram Direct Channel Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-purple-950/20 to-slate-900 border border-blue-500/20 text-right space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
            <Send className="w-3.5 h-3.5 text-blue-400" />
            <span>{isAr ? 'قناة التلجرام الرسمية للأكواد' : 'Official Telegram'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'احصل على أكواد التفعيل الحصرية والتحديثات المستمرة عبر قناتنا'
              : 'Get active keys & release updates from our official channel'}
          </p>
          <a
            href={DEFAULT_TELEGRAM_CHANNEL}
            target="_blank"
            rel="noreferrer noopener"
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors shadow-sm"
          >
            <span>t.me/nabmediastudio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Sidebar Footer: License, Language & Logout */}
      <div className="p-4 border-t border-slate-800/80 bg-[#090d16] space-y-3">
        {/* Activation Status */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="text-right">
              <span className="font-mono text-white text-[11px] block font-bold leading-tight">
                {activation?.code || 'NABMED-VIP-2026'}
              </span>
              <span className="text-[10px] text-emerald-400">
                {activation?.tier || 'VIP Creator Pro'}
              </span>
            </div>
          </div>

          <span className="text-[10px] px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 rounded font-semibold">
            {isAr ? 'نشط' : 'Active'}
          </span>
        </div>

        {/* Language & Logout Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors text-center cursor-pointer"
          >
            {isAr ? 'English 🌐' : 'العربية 🌐'}
          </button>

          {activation?.isActivated && (
            <button
              onClick={onLogout}
              className="py-1.5 px-3 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/40 rounded-lg border border-red-800/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title={isAr ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isAr ? 'خروج' : 'Exit'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Side Menu as requested) */}
      <aside className="hidden lg:flex w-72 h-screen sticky top-0 shrink-0 border-l border-slate-800 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpenMobile(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full z-10 shadow-2xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
