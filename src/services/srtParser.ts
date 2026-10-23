import { SrtCue } from '../types';

export function secondsToSrtTime(totalSec: number): string {
  const safeSec = Math.max(0, totalSec);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = Math.floor(safeSec % 60);
  const milliseconds = Math.floor((safeSec % 1) * 1000);

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

export function srtTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(/[:,]/);
  if (parts.length >= 4) {
    const [h, m, s, ms] = parts.map(Number);
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0) + (ms || 0) / 1000;
  }
  return 0;
}

export function parseSrt(srtContent: string): SrtCue[] {
  if (!srtContent) return [];
  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SrtCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;

    let timeLineIndex = 0;
    if (/^\d+$/.test(lines[0])) {
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const text = lines.slice(timeLineIndex + 1).join(' ').trim();

    const startSeconds = srtTimeToSeconds(startStr);
    const endSeconds = srtTimeToSeconds(endStr);

    cues.push({
      id: cues.length + 1,
      startTime: startStr,
      endTime: endStr,
      startSeconds,
      endSeconds,
      text,
    });
  }

  return cues;
}

export function stringifySrt(cues: SrtCue[]): string {
  return cues
    .map((cue, index) => {
      const start = cue.startTime || secondsToSrtTime(cue.startSeconds);
      const end = cue.endTime || secondsToSrtTime(cue.endSeconds);
      return `${index + 1}\n${start} --> ${end}\n${cue.text}`;
    })
    .join('\n\n');
}

/**
 * Re-segments a script or cues into strict chunks of `maxWordsPerLine` words
 */
export function generateWordLimitedCues(
  text: string,
  maxWords: number = 3,
  totalDurationSeconds: number = 15
): SrtCue[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const safeMaxWords = Math.max(1, Math.min(10, maxWords));
  const textChunks: string[] = [];

  for (let i = 0; i < words.length; i += safeMaxWords) {
    textChunks.push(words.slice(i, i + safeMaxWords).join(' '));
  }

  const durationPerChunk = totalDurationSeconds / textChunks.length;
  const cues: SrtCue[] = [];

  textChunks.forEach((chunk, index) => {
    const startSec = index * durationPerChunk;
    const endSec = Math.min(totalDurationSeconds, (index + 1) * durationPerChunk - 0.05);

    cues.push({
      id: index + 1,
      startTime: secondsToSrtTime(startSec),
      endTime: secondsToSrtTime(endSec),
      startSeconds: Number(startSec.toFixed(3)),
      endSeconds: Number(endSec.toFixed(3)),
      text: chunk,
    });
  });

  return cues;
}
