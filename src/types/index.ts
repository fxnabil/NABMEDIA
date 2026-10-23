export interface ActivationData {
  isActivated: boolean;
  code: string;
  activatedAt: string;
  tier: string;
  githubUrl?: string;
}

export interface SrtCue {
  id: number;
  startTime: string; // "00:00:01,200"
  endTime: string;   // "00:00:02,400"
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
  isSilence: boolean;
}

export interface HookScenario {
  id: number;
  type: string;
  typeLabelAr: string;
  spokenHook: string;
  screenText: string;
  visualDirection: string;
  sfx: string;
  retentionPrediction: number; // percentage 0-100
  rationale: string;
}

export interface RetentionAnalysis {
  overallScore: number;
  first3SecPower: number;
  dropOffRisk: 'low' | 'medium' | 'high';
  dropOffExplanation: string;
  goldenAdvice: string[];
}

export interface ViralTitle {
  title: string;
  triggerType: string;
  triggerLabelAr: string;
  estimatedCtr: string;
}

export interface HookABComparison {
  hookAId: number;
  hookBId: number;
  winner: 'A' | 'B' | 'tie';
  winnerReason: string;
  hookAScore: number;
  hookBScore: number;
  demographicInsight: string;
}

export interface ViralHooksData {
  topicOrScript: string;
  hooks: HookScenario[];
  retention: RetentionAnalysis;
  titles: ViralTitle[];
}

export interface ReelsScriptScene {
  sceneNumber: number;
  timeRange: string;
  cameraAndVisual: string;
  voiceover: string;
  screenText: string;
  sfx: string;
}

export interface ReelsScriptData {
  topic: string;
  targetAudience: string;
  tone: string;
  durationSeconds: number;
  approvedPoints: string[];
  scenes: ReelsScriptScene[];
  estimatedTotalWords: number;
  callToAction: string;
}

export interface ProjectRecord {
  id: string;
  title: string;
  toolType: 'silence_remover' | 'smart_captions' | 'subtitle_translator' | 'viral_hooks' | 'reels_scripts';
  createdAt: string;
  summary: string;
  data: any;
}

export interface FutureTool {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  category: string;
  status: 'coming_soon' | 'in_development' | 'beta_testing';
  votes: number;
  features: string[];
}

