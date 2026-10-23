import { SilenceSegment } from '../types';

let audioCtxInstance: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtxInstance) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxInstance = new AudioCtx();
  }
  if (audioCtxInstance.state === 'suspended') {
    audioCtxInstance.resume();
  }
  return audioCtxInstance;
}

/**
 * Decodes an uploaded Audio or Video file to an AudioBuffer
 */
export async function decodeAudioFromFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  return await ctx.decodeAudioData(arrayBuffer);
}

/**
 * Creates a synthetic speech-like test audio buffer with real speech bursts and silent pauses
 */
export function createSyntheticTestAudio(): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = 44100;
  const duration = 12; // 12 seconds test clip
  const buffer = ctx.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);

  // Time regions: [0-2s Speech], [2-4.5s Silence], [4.5-6.8s Speech], [6.8-9s Silence], [9-11.5s Speech]
  const speechIntervals = [
    { start: 0.2, end: 2.2, freq: 240 },
    { start: 4.5, end: 6.8, freq: 310 },
    { start: 9.0, end: 11.5, freq: 280 },
  ];

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    let isSpeech = false;
    let baseFreq = 220;

    for (const interval of speechIntervals) {
      if (t >= interval.start && t <= interval.end) {
        isSpeech = true;
        baseFreq = interval.freq;
        break;
      }
    }

    if (isSpeech) {
      // Harmonic voice simulation + noise modulation
      const voice =
        Math.sin(2 * Math.PI * baseFreq * t) * 0.4 +
        Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.25 +
        Math.sin(2 * Math.PI * (baseFreq * 3) * t) * 0.15 +
        (Math.random() - 0.5) * 0.05;
      data[i] = voice * Math.min(1, Math.max(0, Math.sin(t * 8) * 1.5));
    } else {
      // Room tone silence (extremely faint)
      data[i] = (Math.random() - 0.5) * 0.0008;
    }
  }

  return buffer;
}

export interface SilenceAnalysisResult {
  duration: number;
  segments: SilenceSegment[];
  speechSegments: { start: number; end: number; duration: number }[];
  silenceCount: number;
  totalSilenceDuration: number;
  savedPercentage: number;
  peaks: Float32Array;
}

/**
 * Detects silent regions in an AudioBuffer based on threshold and min duration
 */
export function analyzeAudioSilences(
  buffer: AudioBuffer,
  thresholdDb: number = -32,
  minSilenceMs: number = 350,
  paddingMs: number = 50
): SilenceAnalysisResult {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const totalDuration = buffer.duration;

  // Window size for RMS analysis (20ms)
  const windowMs = 20;
  const windowSize = Math.floor((sampleRate * windowMs) / 1000);
  const numWindows = Math.floor(channelData.length / windowSize);

  const rmsDbArray: number[] = new Array(numWindows);
  const linearThreshold = Math.pow(10, thresholdDb / 20);

  // Downsampled peaks for UI waveform rendering (300 points)
  const numPeaks = 300;
  const peakStep = Math.floor(channelData.length / numPeaks);
  const peaks = new Float32Array(numPeaks);

  for (let p = 0; p < numPeaks; p++) {
    let max = 0;
    const start = p * peakStep;
    const end = Math.min(channelData.length, start + peakStep);
    for (let j = start; j < end; j += 4) {
      const val = Math.abs(channelData[j]);
      if (val > max) max = val;
    }
    peaks[p] = max;
  }

  // Calculate RMS dB for each window
  for (let i = 0; i < numWindows; i++) {
    const start = i * windowSize;
    let sumSquares = 0;
    for (let j = 0; j < windowSize; j += 2) {
      const val = channelData[start + j];
      sumSquares += val * val;
    }
    const rms = Math.sqrt((sumSquares * 2) / windowSize);
    rmsDbArray[i] = rms > 0.000001 ? 20 * Math.log10(rms) : -100;
  }

  // Identify consecutive silence windows
  const minSilenceWindows = Math.ceil(minSilenceMs / windowMs);
  const paddingWindows = Math.ceil(paddingMs / windowMs);

  const isSilenceWindow = rmsDbArray.map((db) => db < thresholdDb);
  const rawSilenceIntervals: { startWin: number; endWin: number }[] = [];

  let inSilence = false;
  let silenceStart = 0;

  for (let i = 0; i < isSilenceWindow.length; i++) {
    if (isSilenceWindow[i] && !inSilence) {
      inSilence = true;
      silenceStart = i;
    } else if (!isSilenceWindow[i] && inSilence) {
      inSilence = false;
      const durationWins = i - silenceStart;
      if (durationWins >= minSilenceWindows) {
        // Apply padding buffer so we don't clip the words
        const paddedStart = Math.min(i, silenceStart + paddingWindows);
        const paddedEnd = Math.max(paddedStart, i - paddingWindows);
        if (paddedEnd > paddedStart) {
          rawSilenceIntervals.push({ startWin: paddedStart, endWin: paddedEnd });
        }
      }
    }
  }

  // Check end of track
  if (inSilence) {
    const durationWins = isSilenceWindow.length - silenceStart;
    if (durationWins >= minSilenceWindows) {
      rawSilenceIntervals.push({ startWin: silenceStart + paddingWindows, endWin: isSilenceWindow.length });
    }
  }

  // Convert windows to time seconds
  const allSegments: SilenceSegment[] = [];
  const speechSegments: { start: number; end: number; duration: number }[] = [];
  let currentTime = 0;

  for (const interval of rawSilenceIntervals) {
    const silenceStartTime = (interval.startWin * windowMs) / 1000;
    const silenceEndTime = (interval.endWin * windowMs) / 1000;

    if (silenceStartTime > currentTime) {
      // Speech interval
      const speechDuration = silenceStartTime - currentTime;
      speechSegments.push({
        start: currentTime,
        end: silenceStartTime,
        duration: speechDuration,
      });
      allSegments.push({
        start: currentTime,
        end: silenceStartTime,
        duration: speechDuration,
        isSilence: false,
      });
    }

    // Silence interval
    const silenceDur = silenceEndTime - silenceStartTime;
    allSegments.push({
      start: silenceStartTime,
      end: silenceEndTime,
      duration: silenceDur,
      isSilence: true,
    });

    currentTime = silenceEndTime;
  }

  if (currentTime < totalDuration) {
    const speechDuration = totalDuration - currentTime;
    speechSegments.push({
      start: currentTime,
      end: totalDuration,
      duration: speechDuration,
    });
    allSegments.push({
      start: currentTime,
      end: totalDuration,
      duration: speechDuration,
      isSilence: false,
    });
  }

  const totalSilenceDuration = rawSilenceIntervals.reduce((acc, cur) => {
    return acc + ((cur.endWin - cur.startWin) * windowMs) / 1000;
  }, 0);

  const savedPercentage = totalDuration > 0 ? (totalSilenceDuration / totalDuration) * 100 : 0;

  return {
    duration: totalDuration,
    segments: allSegments,
    speechSegments,
    silenceCount: rawSilenceIntervals.length,
    totalSilenceDuration,
    savedPercentage,
    peaks,
  };
}

/**
 * Builds a new AudioBuffer keeping only speech segments
 */
export function buildTrimmedAudioBuffer(
  buffer: AudioBuffer,
  speechSegments: { start: number; end: number }[]
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  const sourceLength = buffer.length;

  // Pre-calculate exact, clamped integer sample indices to eliminate rounding discrepancies
  const ranges = speechSegments
    .map((seg) => {
      const start = Math.max(0, Math.min(sourceLength, Math.floor(seg.start * sampleRate)));
      const end = Math.max(0, Math.min(sourceLength, Math.floor(seg.end * sampleRate)));
      return { start, end, length: Math.max(0, end - start) };
    })
    .filter((r) => r.length > 0);

  // Exact total samples strictly equal to the sum of all segment lengths
  const totalTrimmedSamples = ranges.reduce((sum, r) => sum + r.length, 0);

  if (totalTrimmedSamples <= 0) {
    return ctx.createBuffer(numChannels, 1, sampleRate);
  }

  const outBuffer = ctx.createBuffer(numChannels, totalTrimmedSamples, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const sourceData = buffer.getChannelData(ch);
    const destData = outBuffer.getChannelData(ch);
    let destOffset = 0;

    for (const r of ranges) {
      if (destOffset >= destData.length) break;
      const copyLen = Math.min(r.length, destData.length - destOffset);
      if (copyLen > 0) {
        destData.set(sourceData.subarray(r.start, r.start + copyLen), destOffset);
        destOffset += copyLen;
      }
    }
  }

  return outBuffer;
}

/**
 * Converts an AudioBuffer to a downloadable 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const numSamples = buffer.length;
  const dataByteLength = numSamples * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(wavBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, 'RIFF');
  /* RIFF chunk length */
  view.setUint32(4, 36 + dataByteLength, true);
  /* RIFF type */
  writeString(8, 'WAVE');
  /* format chunk identifier */
  writeString(12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numChannels, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(36, 'data');
  /* data chunk length */
  view.setUint32(40, dataByteLength, true);

  // Write PCM audio data interleaved
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Generates an EDL (Edit Decision List) file text for Adobe Premiere, DaVinci Resolve, Final Cut Pro
 */
export function generateEdl(speechSegments: { start: number; end: number }[], fps = 30): string {
  const formatTimecode = (sec: number) => {
    const f = Math.floor((sec % 1) * fps);
    const s = Math.floor(sec % 60);
    const m = Math.floor((sec % 3600) / 60);
    const h = Math.floor(sec / 3600);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
  };

  let edl = `TITLE: EditsClups Silence Removed Cuts\nFCM: NON-DROP FRAME\n\n`;
  let recTime = 0;

  speechSegments.forEach((seg, idx) => {
    const editNum = String(idx + 1).padStart(3, '0');
    const srcIn = formatTimecode(seg.start);
    const srcOut = formatTimecode(seg.end);
    const recIn = formatTimecode(recTime);
    const recOut = formatTimecode(recTime + (seg.end - seg.start));
    recTime += seg.end - seg.start;

    edl += `${editNum}  AX       AA/V  C        ${srcIn} ${srcOut} ${recIn} ${recOut}\n`;
    edl += `* FROM CLIP NAME: EDITSCLUPS_SOURCE\n\n`;
  });

  return edl;
}

/**
 * Robust audio extraction from any video or audio file.
 * Resamples to 16kHz mono WAV for lightweight transfer and 100% valid container headers.
 */
export async function extractAudioBase64FromFile(
  file: File,
  maxDurationSeconds: number = 180
): Promise<{ base64: string; mimeType: string; duration: number }> {
  try {
    const audioBuffer = await decodeAudioFromFile(file);
    const duration = audioBuffer.duration;

    // Resample to 16kHz mono PCM for pristine, lightweight speech recognition
    const targetSampleRate = 16000;
    const clipDuration = Math.min(duration, maxDurationSeconds);
    const numFrames = Math.max(1, Math.floor(clipDuration * targetSampleRate));

    const OfflineCtxClass =
      window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
    const offlineCtx = new OfflineCtxClass(1, numFrames, targetSampleRate);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0, 0, clipDuration);

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWavBlob(renderedBuffer);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          base64: reader.result as string,
          mimeType: 'audio/wav',
          duration: Math.ceil(clipDuration),
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(wavBlob);
    });
  } catch (err) {
    console.warn('Audio decoding fallback to direct FileReader:', err);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({
          base64: reader.result as string,
          mimeType: file.type || 'audio/mp3',
          duration: 30,
        });
      };
      reader.onerror = reject;
      // Read intact file (up to 25MB) without corrupting header
      reader.readAsDataURL(file.size > 25 * 1024 * 1024 ? file.slice(0, 25 * 1024 * 1024) : file);
    });
  }
}

