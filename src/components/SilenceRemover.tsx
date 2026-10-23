import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Play,
  Pause,
  RotateCcw,
  Download,
  Sliders,
  Scissors,
  Sparkles,
  FileAudio,
  Check,
  Save,
  Clock,
  Zap,
  ArrowRight,
  Layers,
  CheckCircle2,
  Trash,
  Film,
  Headphones,
  Volume2,
} from 'lucide-react';
import {
  decodeAudioFromFile,
  createSyntheticTestAudio,
  analyzeAudioSilences,
  buildTrimmedAudioBuffer,
  audioBufferToWavBlob,
  generateEdl,
  SilenceAnalysisResult,
} from '../services/audioProcessor';
import { saveProject } from '../services/storage';

interface SilenceRemoverProps {
  lang: 'ar' | 'en';
  onSavedToProjects?: () => void;
  onBackToDashboard?: () => void;
}

export const SilenceRemover: React.FC<SilenceRemoverProps> = ({
  lang,
  onSavedToProjects,
  onBackToDashboard,
}) => {
  const isAr = lang === 'ar';

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Upload, 2: Place on Timeline, 3: Cut Silences, 4: Ready to Download
  const [thresholdDb, setThresholdDb] = useState<number>(-32);
  const [minSilenceMs, setMinSilenceMs] = useState<number>(350);
  const [paddingMs, setPaddingMs] = useState<number>(60);
  const [analysis, setAnalysis] = useState<SilenceAnalysisResult | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [skipSilenceInPreview, setSkipSilenceInPreview] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Dedicated Clean Trimmed Audio Preview State
  const [trimmedAudioUrl, setTrimmedAudioUrl] = useState<string | null>(null);
  const [isTrimmedPlaying, setIsTrimmedPlaying] = useState<boolean>(false);
  const [trimmedCurrentTime, setTrimmedCurrentTime] = useState<number>(0);
  const [trimmedDuration, setTrimmedDuration] = useState<number>(0);
  const trimmedAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio nodes for live playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const timelineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Analyze whenever audioBuffer or parameters change
  useEffect(() => {
    if (!audioBuffer) return;
    try {
      const res = analyzeAudioSilences(audioBuffer, thresholdDb, minSilenceMs, paddingMs);
      setAnalysis(res);
      if (currentStep < 3) {
        setCurrentStep(3);
      }
    } catch (e) {
      console.error('Silence analysis error:', e);
    }
  }, [audioBuffer, thresholdDb, minSilenceMs, paddingMs]);

  // Generate trimmed clean audio Blob URL automatically for instant listening & preview before download
  useEffect(() => {
    if (!audioBuffer || !analysis || analysis.speechSegments.length === 0) {
      setTrimmedAudioUrl(null);
      setIsTrimmedPlaying(false);
      setTrimmedCurrentTime(0);
      return;
    }

    try {
      const trimmedBuffer = buildTrimmedAudioBuffer(audioBuffer, analysis.speechSegments);
      const wavBlob = audioBufferToWavBlob(trimmedBuffer);
      const url = URL.createObjectURL(wavBlob);
      setTrimmedAudioUrl(url);
      setTrimmedDuration(trimmedBuffer.duration);
      setTrimmedCurrentTime(0);

      return () => {
        URL.revokeObjectURL(url);
      };
    } catch (e) {
      console.error('Error generating trimmed preview:', e);
    }
  }, [analysis, audioBuffer]);

  // Trimmed audio preview player toggle
  const toggleTrimmedPlay = () => {
    if (!trimmedAudioRef.current) return;
    if (isTrimmedPlaying) {
      trimmedAudioRef.current.pause();
      setIsTrimmedPlaying(false);
    } else {
      // Pause timeline playback if running
      stopPlayback();
      trimmedAudioRef.current.play().then(() => {
        setIsTrimmedPlaying(true);
      }).catch((e) => console.warn('Trimmed play failed:', e));
    }
  };

  const handleTrimmedSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setTrimmedCurrentTime(time);
    if (trimmedAudioRef.current) {
      trimmedAudioRef.current.currentTime = time;
    }
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopPlayback();
    setIsProcessing(true);
    setFileName(file.name);
    setCurrentStep(2); // Step 2: Placing on timeline

    try {
      const buffer = await decodeAudioFromFile(file);
      setAudioBuffer(buffer);
      pausedAtRef.current = 0;
      setCurrentTime(0);
      setCurrentStep(3); // Step 3: Silences detected & cut
    } catch (err) {
      alert(isAr ? 'فشل فك ترميز ملف الصوت/الفيديو.' : 'Failed to decode audio file.');
      setCurrentStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  // Load sample test clip
  const handleLoadSample = () => {
    stopPlayback();
    setIsProcessing(true);
    setFileName(isAr ? 'بودكاست_تجريبي_سكتات_طويلة.wav' : 'demo_podcast_silences.wav');
    setCurrentStep(2);

    setTimeout(() => {
      try {
        const buffer = createSyntheticTestAudio();
        setAudioBuffer(buffer);
        pausedAtRef.current = 0;
        setCurrentTime(0);
        setCurrentStep(3);
      } catch (e) {
        console.error(e);
        setCurrentStep(1);
      } finally {
        setIsProcessing(false);
      }
    }, 400);
  };

  // Playback logic
  const startPlayback = (offsetSeconds = 0) => {
    if (!audioBuffer) return;

    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    const startOffset = Math.min(offsetSeconds, audioBuffer.duration);
    source.start(0, startOffset);
    sourceNodeRef.current = source;
    startTimeRef.current = audioContextRef.current.currentTime - startOffset;
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
    };

    const loop = () => {
      if (!audioContextRef.current || !isPlaying) return;
      const now = audioContextRef.current.currentTime - startTimeRef.current;

      if (now >= audioBuffer.duration) {
        stopPlayback();
        return;
      }

      // If user enabled "Skip Silence", jump across silence cuts
      if (skipSilenceInPreview && analysis) {
        for (const seg of analysis.segments) {
          if (seg.isSilence && now >= seg.start && now < seg.end - 0.05) {
            startPlayback(seg.end);
            return;
          }
        }
      }

      setCurrentTime(now);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const pausePlayback = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {}
      sourceNodeRef.current = null;
    }
    if (audioContextRef.current) {
      pausedAtRef.current = currentTime;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setIsPlaying(false);
  };

  const stopPlayback = () => {
    pausePlayback();
    pausedAtRef.current = 0;
    setCurrentTime(0);
  };

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback(pausedAtRef.current);
    }
  };

  // Render Visual Timeline with Ruler and Waveform
  useEffect(() => {
    const canvas = timelineCanvasRef.current;
    if (!canvas || !analysis) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const duration = analysis.duration;
    const peaks = analysis.peaks;

    // 1. Draw Timecode Ruler (Top 22px)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, 22);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(width, 22);
    ctx.stroke();

    // Ruler marks every 2 seconds
    const intervalSec = duration > 60 ? 10 : duration > 20 ? 5 : 2;
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';

    for (let s = 0; s <= duration; s += intervalSec) {
      const x = (s / duration) * width;
      ctx.beginPath();
      ctx.moveTo(x, 12);
      ctx.lineTo(x, 22);
      ctx.stroke();

      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const timeStr = `${m}:${String(sec).padStart(2, '0')}`;
      ctx.fillText(timeStr, Math.min(width - 30, Math.max(2, x - 12)), 10);
    }

    // 2. Draw Track Backgrounds: Speech (Purple/Dark) & Silences (Red Cut Zones)
    const audioTrackY = 24;
    const audioTrackHeight = height - 24;

    analysis.segments.forEach((seg) => {
      const startX = (seg.start / duration) * width;
      const segWidth = ((seg.end - seg.start) / duration) * width;

      if (seg.isSilence) {
        // Red striped cut zone
        ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
        ctx.fillRect(startX, audioTrackY, segWidth, audioTrackHeight);

        // Top cut border indicator
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(startX, audioTrackY, segWidth, 3);
      } else {
        // Clean speech zone
        ctx.fillStyle = 'rgba(168, 85, 247, 0.08)';
        ctx.fillRect(startX, audioTrackY, segWidth, audioTrackHeight);

        ctx.fillStyle = '#a855f7';
        ctx.fillRect(startX, audioTrackY, segWidth, 2);
      }
    });

    // 3. Draw Waveform Peaks in Audio Track
    const barWidth = width / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const peakVal = peaks[i];
      const barHeight = Math.max(3, peakVal * (audioTrackHeight * 0.8));
      const x = i * barWidth;
      const y = audioTrackY + (audioTrackHeight - barHeight) / 2;

      const timeAtBar = (i / peaks.length) * duration;
      const currentSegment = analysis.segments.find((s) => timeAtBar >= s.start && timeAtBar <= s.end);
      const isSil = currentSegment?.isSilence ?? false;

      ctx.fillStyle = isSil ? '#ef4444' : '#c084fc';
      ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barHeight);
    }

    // 4. Draw Playhead Scrubber with top marker
    const playheadX = (currentTime / duration) * width;

    // Scrubber line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Top playhead triangle
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 10);
    ctx.closePath();
    ctx.fill();
  }, [analysis, currentTime]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioBuffer || !timelineCanvasRef.current) return;
    const rect = timelineCanvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = ratio * audioBuffer.duration;

    pausedAtRef.current = seekTime;
    setCurrentTime(seekTime);
    if (isPlaying) {
      startPlayback(seekTime);
    }
  };

  // Download final clean trimmed audio
  const handleDownloadTrimmedWav = () => {
    if (!audioBuffer || !analysis) return;
    try {
      setCurrentStep(4); // Final step: Ready file
      const trimmedBuffer = buildTrimmedAudioBuffer(audioBuffer, analysis.speechSegments);
      const wavBlob = audioBufferToWavBlob(trimmedBuffer);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NABMEDIA_Clean_${fileName.replace(/\.[^/.]+$/, '') || 'audio'}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Error generating trimmed WAV for download:', e);
    }
  };

  // Download EDL file for Premiere Pro / DaVinci Resolve
  const handleDownloadEdl = () => {
    if (!analysis) return;
    try {
      setCurrentStep(4);
      const edlContent = generateEdl(analysis.speechSegments);
      const blob = new Blob([edlContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NABMEDIA_CutList_${fileName.replace(/\.[^/.]+$/, '') || 'timeline'}.edl`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error('Error generating EDL file:', e);
    }
  };

  const handleSaveToProjects = () => {
    if (!analysis) return;
    saveProject({
      title: fileName || (isAr ? 'تقطيع سكتات التايم لاين' : 'Timeline Silence Cut'),
      toolType: 'silence_remover',
      summary: isAr
        ? `تم تقطيع ${analysis.silenceCount} سكتة وحذف ${analysis.totalSilenceDuration.toFixed(1)} ثانية من التايم لاين`
        : `Cut ${analysis.silenceCount} pauses, saved ${analysis.totalSilenceDuration.toFixed(1)}s on timeline`,
      data: {
        originalDuration: analysis.duration,
        trimmedDuration: analysis.duration - analysis.totalSilenceDuration,
        silenceCount: analysis.silenceCount,
        thresholdDb,
      },
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onSavedToProjects?.();
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 sm:p-7 text-right space-y-6">
      {/* Header with Back button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              {isAr ? 'أداة تقطيع السكتات والتايم لاين الذكي' : 'Timeline Silence Remover & Cutter'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isAr
                ? 'خطوات التقطيع الآلي: وضع الملف على التايم لاين، تقطيع السكتات، حذف الفراغات، واستخراج الملف الجاهز'
                : 'Timeline-based silence cutter: place on timeline, detect dead pauses, cut gaps, and export clean file'}
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

      {/* 4-Step Pipeline Visual Stepper as requested */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
        {[
          {
            step: 1,
            titleAr: '1. استيراد الملف',
            titleEn: '1. Import File',
            descAr: 'رفع الصوت أو الفيديو',
            active: Boolean(audioBuffer),
          },
          {
            step: 2,
            titleAr: '2. التايم لاين',
            titleEn: '2. Place on Timeline',
            descAr: 'توزيع المسار الصوتي',
            active: Boolean(audioBuffer),
          },
          {
            step: 3,
            titleAr: '3. تقطيع السكتات',
            titleEn: '3. Cut Silences',
            descAr: 'تحديد وحذف الفراغات',
            active: Boolean(analysis && analysis.silenceCount > 0),
          },
          {
            step: 4,
            titleAr: '4. إنتاج الملف الجاهز',
            titleEn: '4. Ready Export',
            descAr: 'تحميل الصوت النظيف و EDL',
            active: Boolean(analysis),
          },
        ].map((item) => (
          <div
            key={item.step}
            className={`p-3 rounded-xl border transition-all ${
              item.active
                ? 'bg-purple-950/40 border-purple-500/60 text-purple-200'
                : 'bg-[#0d121d] border-slate-800 text-slate-500'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold mb-1">
              <span>{isAr ? item.titleAr : item.titleEn}</span>
              {item.active && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
            </div>
            <span className="text-[10px] text-slate-400 block">{item.descAr}</span>
          </div>
        ))}
      </div>

      {/* Empty State / Upload trigger */}
      {!audioBuffer ? (
        <div className="py-12 px-6 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-900/30">
          <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400 mb-4">
            <FileAudio className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-white mb-1">
            {isAr ? 'ابدأ بوضع ملفك على التايم لاين' : 'Place your media file onto the timeline'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            {isAr
              ? 'ارفع مقطع فيديو أو بودكاست صوتي، وسيقوم النظام فوراً بتحليله على التايم لاين وتحديد وقص جميع السكتات الميتة.'
              : 'Upload your audio/video and EditsClups will automatically detect and cut all dead silences on the timeline.'}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleLoadSample}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-purple-300 hover:text-white bg-purple-950/40 hover:bg-purple-900/50 border border-purple-700/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'تجربة مقطع بودكاست به سكتات' : 'Load Demo Audio with Pauses'}</span>
            </button>

            <label className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{isAr ? 'رفع ملف صوت أو فيديو' : 'Upload Media File'}</span>
              <input
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Timeline Media Track Container */}
          <div className="bg-[#0b0f17] border border-slate-700/80 rounded-2xl p-4 space-y-4 shadow-xl">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-600/30 transition-transform active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button
                  onClick={stopPlayback}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="إعادة التوقيت للصفر"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <div className="text-xs">
                  <span className="font-mono text-purple-400 font-bold tabular-nums text-sm">
                    {formatSeconds(currentTime)}
                  </span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {formatSeconds(analysis?.duration || 0)}
                  </span>
                </div>

                <span className="text-xs text-slate-400 border-r border-slate-700 pr-3 mr-1 truncate max-w-xs">
                  {fileName}
                </span>
              </div>

              {/* Skip Silence Toggle Switch */}
              <label className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-800/40 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipSilenceInPreview}
                  onChange={(e) => setSkipSilenceInPreview(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-800 border-slate-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className="font-semibold">
                  {isAr ? 'تخطي الفراغات الميتة أثناء المعاينة' : 'Skip Silence Gaps Live'}
                </span>
              </label>
            </div>

            {/* Video Track Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1.5 font-mono">
                  <Film className="w-3.5 h-3.5 text-blue-400" />
                  <span>V1 - Video Track</span>
                </span>
                <span className="font-mono text-slate-500">30 fps</span>
              </div>
              <div className="h-6 w-full bg-slate-900 border border-slate-800 rounded-md flex items-center px-2 text-[10px] text-blue-400 font-mono overflow-hidden">
                <span className="truncate">{fileName}</span>
              </div>
            </div>

            {/* Audio Track with Waveform & Red Silence Cuts */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span className="flex items-center gap-1.5 font-mono">
                  <FileAudio className="w-3.5 h-3.5 text-purple-400" />
                  <span>A1 - Audio Waveform Track</span>
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>{isAr ? 'كلام مفيد' : 'Speech'}</span>
                  </span>
                  <span className="flex items-center gap-1 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>{isAr ? 'فراغ محذوف' : 'Cut Silence'}</span>
                  </span>
                </div>
              </div>

              {/* Interactive Timeline Canvas */}
              <canvas
                ref={timelineCanvasRef}
                width={1000}
                height={160}
                onClick={handleTimelineClick}
                className="w-full h-36 rounded-lg cursor-pointer bg-[#070a10] border border-slate-800 shadow-inner"
              />
            </div>
          </div>

          {/* Precision Threshold & Durations Settings */}
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>{isAr ? 'معايرة حساسية تقطيع السكتات' : 'Silence Cut Sensitivity'}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">{isAr ? 'عتبة الصوت (Threshold)' : 'Threshold'}</span>
                  <span className="font-mono text-purple-400 font-bold">{thresholdDb} dB</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="-15"
                  step="1"
                  value={thresholdDb}
                  onChange={(e) => setThresholdDb(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">{isAr ? 'الحد الأدنى للسكتة' : 'Min Silence'}</span>
                  <span className="font-mono text-purple-400 font-bold">{minSilenceMs} ms</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="1200"
                  step="25"
                  value={minSilenceMs}
                  onChange={(e) => setMinSilenceMs(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-300">{isAr ? 'هامش الأمان للكلام' : 'Padding Buffer'}</span>
                  <span className="font-mono text-purple-400 font-bold">{paddingMs} ms</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="10"
                  value={paddingMs}
                  onChange={(e) => setPaddingMs(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Results Summary Box */}
          {analysis && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-1">
                  {isAr ? 'السكتات المقطوعة' : 'Silences Cut'}
                </span>
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {analysis.silenceCount} {isAr ? 'فراغ' : 'gaps'}
                </span>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-1">
                  {isAr ? 'الوقت المحذوف' : 'Time Saved'}
                </span>
                <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                  {analysis.totalSilenceDuration.toFixed(1)}s
                </span>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-1">
                  {isAr ? 'المدة النهائية النظيفة' : 'Clean Trimmed Duration'}
                </span>
                <span className="text-lg font-bold text-purple-400 font-mono tabular-nums">
                  {formatSeconds(analysis.duration - analysis.totalSilenceDuration)}
                </span>
              </div>

              <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-[11px] text-slate-400 block mb-1">
                  {isAr ? 'نسبة تسريع الإيقاع' : 'Speed Pacing Gain'}
                </span>
                <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                  +{analysis.savedPercentage.toFixed(0)}%
                </span>
              </div>
            </div>
          )}

          {/* Step 4: Dedicated Clean Trimmed Audio Preview Player (المعاينة الصوتية قبل التنزيل) */}
          {trimmedAudioUrl && (
            <div className="p-4 bg-gradient-to-r from-purple-950/50 via-[#131929] to-slate-900 border border-purple-500/40 rounded-2xl space-y-3 shadow-lg">
              <audio
                ref={trimmedAudioRef}
                src={trimmedAudioUrl}
                onTimeUpdate={() => setTrimmedCurrentTime(trimmedAudioRef.current?.currentTime || 0)}
                onEnded={() => setIsTrimmedPlaying(false)}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-purple-900/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isAr ? '🎧 معاينة الصوت النظيف (استمع للنتيجة المقطوعة قبل التنزيل)' : '🎧 Clean Cut Audio Preview (Listen Before Download)'}
                    </span>
                    <span className="text-[11px] text-purple-300">
                      {isAr
                        ? 'تم حذف جميع الفراغات والسكتات - استمع للسرعة والنقاء الآن قبل التحميل'
                        : 'All dead pauses stripped - listen to the high-tempo flow before downloading'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300">
                    {isAr ? `توفير ${analysis?.totalSilenceDuration.toFixed(1)} ثانية` : `Saved ${analysis?.totalSilenceDuration.toFixed(1)}s`}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/50 text-purple-300">
                    {analysis?.silenceCount} {isAr ? 'سكتة محذوفة' : 'cuts'}
                  </span>
                </div>
              </div>

              {/* Player Controls Bar */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={toggleTrimmedPlay}
                  className="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-md shadow-purple-600/40 transition-transform active:scale-95 shrink-0 cursor-pointer"
                  title={isTrimmedPlaying ? 'إيقاف مؤقت' : 'تشغيل المعاينة المقطوعة'}
                >
                  {isTrimmedPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (trimmedAudioRef.current) {
                      trimmedAudioRef.current.currentTime = 0;
                      setTrimmedCurrentTime(0);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                  title="إعادة التوقيت للصفر"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Scrubber slider for trimmed audio */}
                <div className="flex-1 flex flex-col justify-center">
                  <input
                    type="range"
                    min="0"
                    max={trimmedDuration || 1}
                    step="0.05"
                    value={trimmedCurrentTime}
                    onChange={handleTrimmedSeek}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-1">
                    <span className="text-purple-300 font-bold tabular-nums">
                      {formatSeconds(trimmedCurrentTime)}
                    </span>
                    <span className="tabular-nums">
                      {formatSeconds(trimmedDuration)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Ready to Download Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
            <button
              onClick={handleSaveToProjects}
              className="px-4 py-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{isAr ? 'تم الحفظ في المشاريع!' : 'Saved to Projects!'}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isAr ? 'حفظ في المشاريع السابقة' : 'Save Session'}</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadEdl}
                className="px-4 py-2.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                title="تصدير قائمة التقطيع لبريمير برو ودافينشي ريزولف"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصدير التقطيع (EDL)' : 'Export EDL (Premiere/DaVinci)'}</span>
              </button>

              <button
                onClick={handleDownloadTrimmedWav}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>{isAr ? 'تحميل الملف الجاهز النظيف (WAV)' : 'Download Ready Clean WAV'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
