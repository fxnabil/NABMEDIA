import { ProjectRecord } from '../types';

const PROJECTS_KEY = 'editsclups_previous_projects_v1';

export function getPreviousProjects(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) {
      // Default sample projects so user sees active examples right away
      return [
        {
          id: 'proj_sample_1',
          title: 'ريلز - أسرار صناعة المحتوى الفيروسي',
          toolType: 'smart_captions',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
          summary: 'كابتشن سريع 3 كلمات في السطر (نمط أليكس هورموزي) - 18 جزء',
          data: {
            wordsPerLine: 3,
            cuesCount: 18,
            style: 'hormozi',
            srtText: `1\n00:00:00,000 --> 00:00:01,200\nهذا هو السر\n\n2\n00:00:01,250 --> 00:00:02,400\nالحقيقي لصناعة المحتوى\n\n3\n00:00:02,450 --> 00:00:03,600\nالذي ينتشر كالنار`,
          },
        },
        {
          id: 'proj_sample_2',
          title: 'بودكاست تقني - إزالة السكتات 28 دقيقة',
          toolType: 'silence_remover',
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          summary: 'تم تقطيع 142 سكتة صوتية واختصار 4.8 دقيقة بنسبة تسريع 17%',
          data: {
            durationSaved: '4:48 دقيقة',
            cutCount: 142,
            threshold: '-32 dB',
          },
        },
        {
          id: 'proj_sample_3',
          title: 'ترجمة يوتيوب شورتس إلى الإنجليزية',
          toolType: 'subtitle_translator',
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          summary: 'ترجمة فورية متطابقة التوقيت من العربية إلى الإنجليزية',
          data: {
            sourceLang: 'العربية',
            targetLang: 'English',
            cuesCount: 24,
          },
        },
      ];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading projects:', err);
    return [];
  }
}

export function saveProject(project: Omit<ProjectRecord, 'id' | 'createdAt'>): ProjectRecord {
  const existing = getPreviousProjects();
  const newRecord: ProjectRecord = {
    ...project,
    id: 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
  };

  const updated = [newRecord, ...existing.filter((p) => p.id !== newRecord.id)].slice(0, 50);
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local storage quota error:', e);
  }
  return newRecord;
}

export function deleteProject(id: string): ProjectRecord[] {
  const existing = getPreviousProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(existing));
  return existing;
}
