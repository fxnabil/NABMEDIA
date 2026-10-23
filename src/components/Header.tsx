import React from 'react';
import { LogOut, Film, Send } from 'lucide-react';
import { DEFAULT_TELEGRAM_CHANNEL } from '../services/activation';
import { ActivationData } from '../types';

interface HeaderProps {
  activation: ActivationData | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activation,
  onLogout,
  activeTab,
  setActiveTab,
  lang,
  setLang,
}) => {
  const isAr = lang === 'ar';

  const navLinks = [
    { id: 'all_tools', labelAr: 'لوحة الأدوات', labelEn: 'Dashboard' },
    { id: 'silence_remover', labelAr: 'تقطيع السكتات', labelEn: 'Silence Remover' },
    { id: 'smart_captions', labelAr: 'كابتشن SRT', labelEn: 'Smart Captions' },
    { id: 'subtitle_translator', labelAr: 'ترجمة الكابتشن', labelEn: 'Translator' },
    { id: 'projects', labelAr: 'المشاريع السابقة', labelEn: 'Projects' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (One-line) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-900/30">
            <Film className="w-5 h-5" />
          </div>
          <button
            onClick={() => setActiveTab('all_tools')}
            className="text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-purple-300 transition-colors"
          >
            EditsClups
          </button>
        </div>

        {/* Zone 2: Clean 4–5 single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          {navLinks.map((link) => {
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
                  isActive
                    ? 'text-purple-400 font-semibold border-b-2 border-purple-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? link.labelAr : link.labelEn}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action + Quick Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Telegram Channel Shortcut */}
          <a
            href={DEFAULT_TELEGRAM_CHANNEL}
            target="_blank"
            rel="noreferrer noopener"
            title="قناة التلجرام الرسمية للأكواد"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-950/40 hover:bg-blue-900/50 border border-blue-800/40 rounded-lg transition-colors whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isAr ? 'قناة التلجرام' : 'Telegram'}</span>
          </a>

          {/* Language Toggle */}
          <button
            onClick={() => setLang(isAr ? 'en' : 'ar')}
            className="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors whitespace-nowrap"
            title="تبديل اللغة / Switch Language"
          >
            {isAr ? 'EN' : 'عربي'}
          </button>

          {/* Logout / Deactivate Button as requested in prompt */}
          {activation?.isActivated && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-900/40 border border-red-800/40 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              title={isAr ? 'تسجيل الخروج وإلغاء التفعيل الحالي' : 'Logout / Deactivate'}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isAr ? 'تسجيل الخروج' : 'Logout'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
