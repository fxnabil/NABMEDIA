import React, { useState } from 'react';
import {
  FolderClock,
  Search,
  Trash2,
  ExternalLink,
  Download,
  Scissors,
  FileText,
  Languages,
  Calendar,
  Layers,
  Sparkles,
  Flame,
  Clapperboard,
} from 'lucide-react';
import { ProjectRecord } from '../types';
import { deleteProject } from '../services/storage';

interface PreviousProjectsProps {
  projects: ProjectRecord[];
  onRefreshProjects: () => void;
  onOpenProject: (project: ProjectRecord) => void;
  lang: 'ar' | 'en';
}

export const PreviousProjects: React.FC<PreviousProjectsProps> = ({
  projects,
  onRefreshProjects,
  onOpenProject,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = projects.filter((p) => {
    const matchesFilter = filterType === 'all' || p.toolType === filterType;
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(isAr ? 'هل أنت متأكد من حذف هذا المشروع من السجل؟' : 'Delete this project?')) {
      deleteProject(id);
      onRefreshProjects();
    }
  };

  const handleDownloadProjectData = (project: ProjectRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    let content = '';
    let ext = 'txt';

    if (project.toolType === 'smart_captions' && project.data?.srtContent) {
      content = project.data.srtContent;
      ext = 'srt';
    } else if (project.toolType === 'subtitle_translator' && project.data?.translatedSrt) {
      content = project.data.translatedSrt;
      ext = 'srt';
    } else if (project.toolType === 'reels_scripts' && project.data?.scenes) {
      content = `🎬 سكريبت ريلز: ${project.data.topic}\n\n`;
      project.data.scenes.forEach((s: any) => {
        content += `[مشهد ${s.sceneNumber} (${s.timeRange})]\nالكلام: ${s.voiceover}\nالكاميرا: ${s.cameraAndVisual}\nالشاشة: ${s.screenText}\nSFX: ${s.sfx}\n\n`;
      });
      ext = 'txt';
    } else if (project.toolType === 'viral_hooks' && project.data?.hooks) {
      content = `🔥 هوكات وعناوين فيروسية: ${project.data.topicOrScript}\n\n--- الهوكات الخمسة ---\n`;
      project.data.hooks.forEach((h: any, idx: number) => {
        content += `${idx + 1}. [${h.typeLabelAr || h.type}] (${h.retentionPrediction}% احتفاظ)\nالكلام: ${h.spokenHook}\nالشاشة: ${h.screenText}\nالكاميرا: ${h.visualDirection}\nSFX: ${h.sfx}\n\n`;
      });
      ext = 'txt';
    } else {
      content = JSON.stringify(project.data, null, 2);
      ext = 'json';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getToolMeta = (type: string) => {
    switch (type) {
      case 'viral_hooks':
        return {
          name: isAr ? 'هوكات وعناوين' : 'Viral Hooks',
          icon: Flame,
          color: 'text-amber-400 bg-amber-950/50 border-amber-800/40',
        };
      case 'reels_scripts':
        return {
          name: isAr ? 'سكريبت ريلز' : 'Reels Script',
          icon: Clapperboard,
          color: 'text-indigo-400 bg-indigo-950/50 border-indigo-800/40',
        };
      case 'silence_remover':
        return {
          name: isAr ? 'تقطيع السكتات' : 'Silence Cut',
          icon: Scissors,
          color: 'text-purple-400 bg-purple-950/50 border-purple-800/40',
        };
      case 'smart_captions':
        return {
          name: isAr ? 'كابتشن SRT' : 'Smart Captions',
          icon: FileText,
          color: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/40',
        };
      case 'subtitle_translator':
        return {
          name: isAr ? 'ترجمة نصوص' : 'Translator',
          icon: Languages,
          color: 'text-blue-400 bg-blue-950/50 border-blue-800/40',
        };
      default:
        return {
          name: isAr ? 'مشروع مونتاج' : 'Edit Project',
          icon: Layers,
          color: 'text-slate-400 bg-slate-800',
        };
    }
  };


  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div id="previous-projects" className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-7 text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <FolderClock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isAr ? 'المشاريع السابقة (Previous Projects)' : 'Project History & Edits'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'سجل أعمالك السابقة المحفوظة محلياً لسهولة الرجوع إليها واستئناف العمل أو تحميل الملفات'
                : 'Locally saved editor sessions for quick resumption and file retrieval'}
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isAr ? 'بحث في المشاريع...' : 'Search projects...'}
            className="w-full pl-3 pr-9 py-2 text-xs bg-[#0d121d] border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <Search className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Segmented Filter Bar */}
      <div className="my-5 flex flex-wrap items-center gap-2">
        {[
          { id: 'all', labelAr: 'الكل', labelEn: 'All' },
          { id: 'silence_remover', labelAr: 'تقطيع السكتات', labelEn: 'Silence Cuts' },
          { id: 'smart_captions', labelAr: 'كابتشن SRT', labelEn: 'Smart Captions' },
          { id: 'subtitle_translator', labelAr: 'الترجمات', labelEn: 'Translations' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              filterType === tab.id
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                : 'bg-slate-800/60 text-slate-400 hover:text-white border-slate-700/60'
            }`}
          >
            {isAr ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Projects List Grid */}
      {filtered.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
          <FolderClock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-xs text-slate-400">
            {isAr ? 'لا توجد مشاريع سابقة مطابقة للبحث' : 'No projects found matching your criteria.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => {
            const meta = getToolMeta(proj.toolType);
            const Icon = meta.icon;

            return (
              <div
                key={proj.id}
                onClick={() => onOpenProject(proj)}
                className="group p-4 bg-[#0d121d] hover:bg-[#131926] border border-slate-800 hover:border-slate-700 rounded-xl transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top metadata strip */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${meta.color}`}>
                      <Icon className="w-3 h-3" />
                      <span>{meta.name}</span>
                    </span>

                    <span className="text-[11px] font-mono text-slate-400 tabular-nums">
                      {formatDate(proj.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                    {proj.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {proj.summary}
                  </p>
                </div>

                {/* Footer actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-purple-400 group-hover:underline flex items-center gap-1">
                    <span>{isAr ? 'استئناف العمل' : 'Open project'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDownloadProjectData(proj, e)}
                      className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isAr ? 'تحميل ملف المشروع' : 'Download project file'}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDelete(proj.id, e)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                      title={isAr ? 'حذف المشروع' : 'Delete'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
