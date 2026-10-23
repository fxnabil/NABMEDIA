import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Increase payload limit for audio/video snippets
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Helper to get or instantiate Gemini Client
// STRICT SECURITY POLICY: Relies EXCLUSIVELY and ONLY on the user-provided personal API key!
// Under NO circumstances does it fall back to developer credentials or process.env.GEMINI_API_KEY.
// This guarantees 100% protection of the developer account with zero credit consumption.
function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const key = customApiKey && typeof customApiKey === 'string' ? customApiKey.trim() : '';
  if (!key) return null;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}


// User specified GitHub TXT file URL and Telegram Channel
const DEFAULT_GITHUB_URL = 'https://raw.githubusercontent.com/fxnabil/nabmedia-studio/refs/heads/main/code.txt?token=GHSAT0AAAAAAENEBJXTWDOUEDIX7RA7G6NO2W2BNHQ';
const DEFAULT_TELEGRAM_CHANNEL = 'https://t.me/nabmediastudio';

// Helper to convert GitHub blob URLs to raw user content URLs
function normalizeGitHubRawUrl(urlStr: string): string {
  if (!urlStr) return DEFAULT_GITHUB_URL;
  let clean = urlStr.trim();
  if (clean.includes('github.com') && clean.includes('/blob/')) {
    clean = clean
      .replace('https://github.com/', 'https://raw.githubusercontent.com/')
      .replace('http://github.com/', 'https://raw.githubusercontent.com/')
      .replace('/blob/', '/');
  }
  return clean;
}

// Read codes strictly line-by-line from text
function parseCodesFromText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

// Load local code.txt lines
function getLocalCodeLines(): string[] {
  try {
    const codeFilePath = path.join(__dirname, 'code.txt');
    if (fs.existsSync(codeFilePath)) {
      const content = fs.readFileSync(codeFilePath, 'utf-8');
      const lines = parseCodesFromText(content);
      if (lines.length > 0) return lines;
    }
  } catch (err) {
    console.error('Error reading local code.txt:', err);
  }
  return [
    'EP3120-SFVT22-S156DR-23F562',
    'NABMED-VIP100-202600-V01000',
    'EDITS-PRO-2026',
    'NABMEDIA-VIP-2026',
    'CLUPS-VIP-779',
    'CREATOR-KEY-994',
    'TIKTOK-REEL-2026',
    'VIRAL-FLOW-888',
    'SPECIAL-BETA-01',
    'YOUTUBE-EDIT-55',
    'EDITS-MASTER-VIP',
    'SMART-CAPTION-2026',
    'SILENCE-CUT-PRO',
    'NAB-STUDIO-PRO',
  ];
}

// 1. Activation codes endpoint: fetches from GitHub TXT file or local code.txt
app.get('/api/activation/codes', async (req, res) => {
  const rawQueryUrl = req.query.url as string;
  const targetUrl = normalizeGitHubRawUrl(rawQueryUrl || DEFAULT_GITHUB_URL);
  let codes: string[] = [];
  let source = 'github_remote';

  try {
    const response = await fetch(targetUrl, { signal: AbortSignal.timeout(6000) });
    if (response.ok) {
      const text = await response.text();
      codes = parseCodesFromText(text);
    }
  } catch (err) {
    console.warn('Could not fetch from remote GitHub URL, reading local code.txt:', err);
  }

  // Fallback to local code.txt if remote was unavailable or empty
  if (codes.length === 0) {
    codes = getLocalCodeLines();
    source = 'local_file';
  }

  res.json({
    success: true,
    source,
    targetUrl,
    count: codes.length,
    codes,
    telegramChannel: DEFAULT_TELEGRAM_CHANNEL,
  });
});

// 2. Strict Verification API: strictly compares input against lines in TXT file
app.post('/api/activation/verify', async (req, res) => {
  const { code, githubUrl } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, message: 'كود التفعيل مطلوب' });
  }

  const cleanInput = code.trim();
  const urlToFetch = normalizeGitHubRawUrl(githubUrl || DEFAULT_GITHUB_URL);

  let validLines: string[] = [];

  // Try fetching the remote GitHub TXT file
  try {
    const response = await fetch(urlToFetch, { signal: AbortSignal.timeout(6000) });
    if (response.ok) {
      const text = await response.text();
      validLines = parseCodesFromText(text);
    }
  } catch (err) {
    console.warn('Failed to fetch from GitHub URL:', err);
  }

  // If remote returned nothing, use local code.txt
  if (validLines.length === 0) {
    validLines = getLocalCodeLines();
  }

  // Strict line-by-line comparison
  const isMatch = validLines.some((line) => line.toUpperCase() === cleanInput.toUpperCase());

  if (isMatch) {
    return res.json({
      success: true,
      message: 'تم التحقق من الكود بنجاح من أسطر ملف الأكواد! مرحباً بك في NABMEDIA STUDIO',
      activation: {
        code: cleanInput.toUpperCase(),
        status: 'active',
        activatedAt: new Date().toISOString(),
        tier: 'VIP Creator Pro',
        featuresUnlocked: ['silence_remover', 'smart_captions_srt', 'subtitle_translator', 'future_toolkit'],
      },
    });
  } else {
    return res.status(401).json({
      success: false,
      message: 'الكود غير صالح أو غير صحيح',
      telegramChannel: DEFAULT_TELEGRAM_CHANNEL,
    });
  }
});

// 3. Validate User-Provided Gemini API Key
app.post('/api/gemini/validate-key', async (req, res) => {
  const customKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const client = getGeminiClient(customKey);

  if (!client) {
    return res.status(400).json({
      success: false,
      message: 'لم يتم إدخال مفتاح API ولا يوجد مفتاح نظام صالح.',
    });
  }

  try {
    const testRes = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping test. Reply with single word "OK".',
    });

    if (testRes.text) {
      return res.json({
        success: true,
        message: 'مفتاح Gemini API صالح وشغال بنجاح 100%!',
        model: 'gemini-2.5-flash',
      });
    }

    return res.status(400).json({
      success: false,
      message: 'تعذر التحقق من استجابة جيميناي. تأكد من صحة المفتاح.',
    });
  } catch (err: any) {
    console.error('Gemini Key validation error:', err?.message || err);
    return res.status(400).json({
      success: false,
      message: err?.message || 'المفتاح غير صالح أو انتهت صلاحيته.',
    });
  }
});

// Helper to normalize audio MIME type for Gemini
function normalizeAudioMimeType(mime?: string, filename?: string): string {
  if (!mime || mime === 'application/octet-stream') {
    if (filename?.endsWith('.wav')) return 'audio/wav';
    if (filename?.endsWith('.mp3')) return 'audio/mp3';
    if (filename?.endsWith('.m4a')) return 'audio/aac';
    if (filename?.endsWith('.mp4')) return 'video/mp4';
    if (filename?.endsWith('.webm')) return 'audio/webm';
    return 'audio/mp3';
  }
  const lower = mime.toLowerCase();
  if (lower.includes('wav')) return 'audio/wav';
  if (lower.includes('mp4')) return 'video/mp4';
  if (lower.includes('webm')) return 'audio/webm';
  if (lower.includes('m4a') || lower.includes('aac')) return 'audio/aac';
  if (lower.includes('ogg')) return 'audio/ogg';
  if (lower.includes('flac')) return 'audio/flac';
  if (lower.includes('mpeg') || lower.includes('mp3')) return 'audio/mp3';
  return 'audio/mp3';
}

function extractSrtText(raw: string): string {
  let clean = raw.replace(/^```(srt)?\s*/im, '').replace(/```$/im, '').trim();
  const srtBlockMatch = clean.match(/(?:^|\n)(1\s*\r?\n\d{2}:\d{2}:\d{2}[\s\S]*)/);
  if (srtBlockMatch) {
    clean = srtBlockMatch[1].trim();
  }
  return clean;
}

// 4. Audio/Video Transcription with Dialect & Word-Limit Slicing (STRICT USER KEY ONLY)
app.post('/api/transcribe-captions', async (req, res) => {
  const {
    audioBase64,
    mimeType = 'audio/mp3',
    filename,
    language = 'ar',
    dialect = 'العربية الفصحى',
    wordsPerLine = 3,
    approxDuration = 15,
  } = req.body;

  const maxWords = Math.max(1, Math.min(8, Number(wordsPerLine) || 3));
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const client = getGeminiClient(userApiKey);

  // STRICT PROTECTION: If user did not provide their own Gemini API key, refuse execution.
  // Zero developer credit is ever consumed.
  if (!client) {
    return res.status(400).json({
      success: false,
      requireApiKey: true,
      message: 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك من قائمة "الإعدادات". المنصة تعمل حصراً بمفتاح المستخدم المجاني ولا تستهلك أي رصيد من المطور إطلاقاً.',
    });
  }

  if (!audioBase64) {
    return res.status(400).json({
      success: false,
      message: 'يرجى رفع ملف صوتي أو فيديو للبدء بالتفريغ.',
    });
  }

  try {
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const finalMime = normalizeAudioMimeType(mimeType, filename);

    const prompt = `You are an elite video editor and caption generator for viral vertical videos (Instagram Reels, TikTok, YouTube Shorts).
Your task is to transcribe this audio file into valid SubRip (.srt) subtitle format with STRICT constraints:
1. Language: ${language}
2. Dialect/Accent: ${dialect} (transcribe speech exactly as pronounced in this dialect/accent, keeping natural rhythm).
3. WORD LIMIT: Each subtitle line MUST have at most ${maxWords} words (Alex Hormozi fast-paced style).
4. Timecodes: Accurate millisecond timestamps (00:00:00,000 --> 00:00:01,400).
5. Output ONLY the raw .srt text block. Do not include markdown codeblocks or conversational text.`;

    const audioPart = {
      inlineData: {
        mimeType: finalMime,
        data: cleanBase64,
      },
    };

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [audioPart, { text: prompt }] },
    });

    const srtOutput = extractSrtText(response.text || '');

    if (srtOutput.includes('-->')) {
      return res.json({
        success: true,
        srt: srtOutput,
        engine: 'gemini-2.5-flash',
        dialect,
        userQuotaUsed: true,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'تعذر تنسيق المخرجات كملف SRT صالح من الذكاء الاصطناعي. يرجى إعادة المحاولة.',
    });
  } catch (err: any) {
    console.error('Gemini audio transcription error:', err);
    return res.status(400).json({
      success: false,
      message: err?.message || 'حدث خطأ أثناء معالجة الصوت بواسطة مفتاح Gemini الخاص بك. تحقق من صلاحية المفتاح في الإعدادات.',
    });
  }
});

// 4.1 Viral Hooks & Million-View Titles Generator (STRICT USER KEY ONLY)
app.post('/api/generate-hooks', async (req, res) => {
  const { topicOrScript, duration = '30-60s', tone = 'viral' } = req.body;

  if (!topicOrScript || typeof topicOrScript !== 'string' || !topicOrScript.trim()) {
    return res.status(400).json({ success: false, message: 'موضوع الفيديو أو نص السكريبت مطلوب.' });
  }

  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const client = getGeminiClient(userApiKey);

  if (!client) {
    return res.status(400).json({
      success: false,
      requireApiKey: true,
      message: 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك من قائمة "الإعدادات" لتشغيل مولد الهوك والعناوين. لن يتم استهلاك أي رصيد من المطور.',
    });
  }

  try {
    const prompt = `أنت خبير واستراتيجي عالمي في صناعة الفيديوهات الفيروسية القصيرة (Instagram Reels, TikTok, YouTube Shorts).
المهمة:
قم بتحليل الموضوع/السكريبت التالي، وابتكار:
1. بالضبط 5 سيناريوهات هوك (Hook Scenarios) لأول 3 ثواني من الفيديو تضمن بقاء المشاهد وإيقاف التمرير (Stop the Scroll):
   - سيناريو 1: هوك الصدمة والخطأ الفادح (Negative / Shock Hook)
   - سيناريو 2: فجوة الفضول القصوى المفتوحة (Curiosity Gap Hook)
   - سيناريو 3: هوك القصة والتحول السريع (Story / Transformation Hook)
   - سيناريو 4: هوك الاستفزاز والمقارنة الصادمة (Contrarian / The Callout)
   - سيناريو 5: هوك الرقم والسر الخفي (Golden Number / Secret Value Hook)
   لكل سيناريو حدد:
   - spokenHook: الكلام المنطوق الذي يقال في أول 3 ثواني (قصير جداً ومباشر).
   - screenText: النص البارز الذي يظهر على الشاشة بخط عريض.
   - visualDirection: حركة الكاميرا والجسد وتعبير الوجه المطلوب لجذب العين.
   - sfx: المؤثر الصوتي المقترح المناسب للثانية الأولى (Whoosh, Glitch, Record Scratch, Impact...).
   - retentionPrediction: نسبة مئوية متوقعة للاحتفاظ بالمشاهد في أول 3 ثواني (رقم من 75 إلى 98).
   - rationale: تحليل نفسي سريع لماذا ينجح هذا الهوك.

2. تحليل شامل لمعدل الاحتفاظ بالجمهور (Audience Retention Analysis):
   - overallScore: درجة عامة من 100.
   - first3SecPower: قوة أول 3 ثواني من 100.
   - dropOffRisk: "low" أو "medium" أو "high".
   - dropOffExplanation: تحليل لنقطة الهبوط المتوقعة للمشاهدين وكيفية تفاديها.
   - goldenAdvice: مصفوفة من 3 نصائح ذهبية عملية لرفع مدة المشاهدة حتى الثانية الأخيرة.

3. صياغة 5 إلى 6 عناوين بأسلوب المليون مشاهدة (Million-View Titles):
   - عناوين قصيرة، مغرية للنقر، ذات محفز نفسي قوي (فضول، خسارة، مكسب سريع، صدمة).
   - triggerType: نوع المحفز النفسي (curiosity, fear_of_loss, fast_gain, controversy, secret).
   - triggerLabelAr: وصف المحفز بالعربية.
   - estimatedCtr: معدل النقر المتوقع (مثال: "14.5%").

الموضوع / مسودة السكريبت:
"""
${topicOrScript.trim()}
"""
النبرة المستهدفة: ${tone}
المدة المقترحة: ${duration}

يجب أن تكون الاستجابة حصراً بصيغة JSON وفق المخطط التالي:
{
  "hooks": [
    {
      "id": 1,
      "type": "negative_shock",
      "typeLabelAr": "هوك الصدمة والخطأ الفادح",
      "spokenHook": "...",
      "screenText": "...",
      "visualDirection": "...",
      "sfx": "...",
      "retentionPrediction": 94,
      "rationale": "..."
    }
  ],
  "retention": {
    "overallScore": 89,
    "first3SecPower": 92,
    "dropOffRisk": "low",
    "dropOffExplanation": "...",
    "goldenAdvice": ["...", "...", "..."]
  },
  "titles": [
    {
      "title": "...",
      "triggerType": "curiosity",
      "triggerLabelAr": "فضول شديد وسر مخفي",
      "estimatedCtr": "18.2%"
    }
  ]
}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (err: any) {
    console.error('Generate hooks error:', err);
    return res.status(400).json({
      success: false,
      message: err?.message || 'حدث خطأ أثناء توليد الهوكات. يرجى التحقق من مفتاح Gemini الخاص بك.',
    });
  }
});

// 4.2 Interactive Hook A/B Test Simulator
app.post('/api/compare-hooks-ab', async (req, res) => {
  const { hookA, hookB, topic } = req.body;

  if (!hookA || !hookB) {
    return res.status(400).json({ success: false, message: 'مطلوب تحديد الهوكين A و B للمقارنة.' });
  }

  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const client = getGeminiClient(userApiKey);

  if (!client) {
    return res.status(400).json({
      success: false,
      requireApiKey: true,
      message: 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك في الإعدادات.',
    });
  }

  try {
    const prompt = `قارن بين هذين الهوكين لفيديو ريلز قصير حول موضوع: "${topic || 'عام'}":
الهوك A: "${typeof hookA === 'string' ? hookA : hookA.spokenHook}"
الهوك B: "${typeof hookB === 'string' ? hookB : hookB.spokenHook}"

حلل خوارزمياً ونفسياً:
1. من سيفوز في إيقاف التمرير في أول ثانيتين (winner: "A" أو "B")؟
2. تقييم الهوك A من 100 (hookAScore)
3. تقييم الهوك B من 100 (hookBScore)
4. سبب تفوق الفائز بدقة (winnerReason).
5. شريحة الجمهور الأكثر تفاعلاً مع كل منهما (demographicInsight).

أخرج النتيجة كـ JSON حصراً:
{
  "winner": "A",
  "winnerReason": "...",
  "hookAScore": 94,
  "hookBScore": 86,
  "demographicInsight": "..."
}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'حدث خطأ أثناء إجراء اختبار A/B.',
    });
  }
});

// 4.3 Reels Script Maker - Step 1: Research & Golden Points Checklist (STRICT USER KEY ONLY)
app.post('/api/generate-script-points', async (req, res) => {
  const { topic, targetAudience = 'الجميع', tone = 'حماسي وسريع', durationSeconds = 45 } = req.body;

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ success: false, message: 'يرجى كتابة موضوع الريلز للبدء.' });
  }

  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const client = getGeminiClient(userApiKey);

  if (!client) {
    return res.status(400).json({
      success: false,
      requireApiKey: true,
      message: 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك من قائمة "الإعدادات" لإنشاء السكريبتات.',
    });
  }

  try {
    const prompt = `أنت خبير كتابة سكريبتات ريلز فيروسية (Reels / TikTok Scriptwriter).
المطلوب: قم بالبحث وتحليل موضوع الفيديو القصير، واستخراج 5 إلى 6 نقاط جوهرية (Golden Bullet Points) تشكل هيكل السكريبت قبل أن يعتمدها المستخدم:
الموضوع: "${topic.trim()}"
الجمهور المستهدف: ${targetAudience}
النبرة: ${tone}
المدة المستهدفة: ${durationSeconds} ثانية

المخرجات JSON:
{
  "researchSummary": "ملخص سريع لزاوية الطرح الفيروسية لهذا الموضوع...",
  "points": [
    {
      "id": 1,
      "title": "عنوان النقطة المختصر",
      "detail": "تفصيل النقطة أو المعلومة الصادمة التي ستقال",
      "type": "افتتاحية صادمة / خطأ شائع / الحل الجوهري / مثال تطبيقي / دعوة للتفاعل"
    }
  ]
}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'حدث خطأ أثناء استخراج نقاط السكريبت.',
    });
  }
});

// 4.4 Reels Script Maker - Step 2: Generate Full Scene-by-Scene Script (STRICT USER KEY ONLY)
app.post('/api/generate-reels-script', async (req, res) => {
  const {
    topic,
    targetAudience = 'الجميع',
    tone = 'حماسي وسريع',
    durationSeconds = 45,
    approvedPoints = [],
  } = req.body;

  if (!topic || !approvedPoints || approvedPoints.length === 0) {
    return res.status(400).json({ success: false, message: 'مطلوب موضوع ونقاط معتمدة لإنشاء السكريبت.' });
  }

  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const client = getGeminiClient(userApiKey);

  if (!client) {
    return res.status(400).json({
      success: false,
      requireApiKey: true,
      message: 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك من قائمة "الإعدادات".',
    });
  }

  try {
    const prompt = `أنت مخرج ومؤلف سكريبتات ريلز فيروسية محترف.
قم بكتابة سكريبت إنتاج كامل مقسم لمشاهد متسلسلة بدقة للفيديو القصير (Instagram Reel / TikTok) بالاعتماد حصراً على النقاط التي وافق عليها المستخدم:

الموضوع: "${topic}"
الجمهور: ${targetAudience}
النبرة: ${tone}
المدة الكلية المحددة: ${durationSeconds} ثانية (يجب أن تتطابق سرعة الكلمات بدقة مع هذه المدة، بمعدل تقريبي 2.5 كلمة لكل ثانية).

النقاط المعتمدة من المستخدم:
${approvedPoints.map((p: string, i: number) => `${i + 1}. ${p}`).join('\n')}

المطلوب تفصيل السكريبت مشهداً بمشهد (كل مشهد من ثانيتين إلى 6 ثوانٍ كحد أقصى للحفاظ على إيقاع سريع) بحيث يتضمن:
- sceneNumber: رقم المشهد.
- timeRange: النطاق الزمني مثل "00:00 - 00:03"
- cameraAndVisual: حركة الكاميرا، زاوية اللقطة، وتوجيه الحركة البصرية (مثال: Zoom-in سريع، لقطة مقربة للوجه، إشارة باليد، شاشة خضراء...).
- voiceover: الكلام المنطوق بالضبط مع علامات الترقيم للنبرة.
- screenText: النصوص البارزة أو الكلمات المفتاحية بالخط العريض على الشاشة (مثل نمط Alex Hormozi).
- sfx: المؤثر الصوتي المطلوب (Whoosh, Pop, Cinematic Boom, Cash sound...).

أخرج النتيجة كـ JSON حصراً وفق النموذج:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "timeRange": "00:00 - 00:03",
      "cameraAndVisual": "...",
      "voiceover": "...",
      "screenText": "...",
      "sfx": "..."
    }
  ],
  "estimatedTotalWords": 110,
  "callToAction": "الدعوة الختامية للتفاعل وحفظ الفيديو..."
}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      message: err?.message || 'حدث خطأ أثناء كتابة السكريبت النهائي.',
    });
  }
});


// 5. Subtitle Translator API (STRICT USER KEY ONLY)
app.post('/api/translate-srt', async (req, res) => {
  const { srtContent, targetLanguage = 'en' } = req.body;

  if (!srtContent || typeof srtContent !== 'string') {
    return res.status(400).json({ success: false, message: 'محتوى SRT غير متوفر' });
  }

  // STRICT PROTECTION: If user did not provide their own Gemini API key, refuse execution.
  // Zero developer credit is ever consumed.
  const userApiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const client = getGeminiClient(userApiKey);

  if (!client) {
    return res.status(400).json({
      success: false,
      requireApiKey: true,
      message: 'مطلوب إدخال مفتاح Google Gemini API الشخصي الخاص بك من قائمة "الإعدادات" لترجمة السبتيتل. لن يتم استخدام أي رصيد من حساب المطور إطلاقاً.',
    });
  }

  try {
    const prompt = `You are a specialized subtitle translator for video creators.
Translate the subtitle texts in this SubRip (.srt) file into: "${targetLanguage}".
STRICT RULES:
1. PRESERVE EVERY sequential number (1, 2, 3...) and timecode line (00:00:01,000 --> 00:00:03,500) EXACTLY.
2. DO NOT modify any timecodes, arrows, or line numbers.
3. Only translate the subtitle text lines naturally, punchily, suited for short-form video editing.
4. Return ONLY valid .srt content. Do not include markdown or explanations.

Input SRT:
${srtContent}`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    let translated = response.text || '';
    translated = translated.replace(/^```(srt)?\s*/i, '').replace(/```$/i, '').trim();

    if (translated.includes('-->')) {
      return res.json({
        success: true,
        engine: 'gemini-2.5-flash',
        translatedSrt: translated,
        userQuotaUsed: true,
      });
    }

    return res.status(500).json({
      success: false,
      message: 'تعذر استلام نتيجة SRT صالحة من الذكاء الاصطناعي.',
    });
  } catch (err: any) {
    console.error('Gemini translate error:', err);
    return res.status(400).json({
      success: false,
      message: err?.message || 'حدث خطأ أثناء الترجمة عبر مفتاح Gemini الخاص بك. تحقق من صلاحية المفتاح في الإعدادات.',
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`EditsClups server running on port ${PORT} [mode: ${isProd ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
