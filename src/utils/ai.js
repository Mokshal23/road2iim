import { safeParseScreenshotJSON, safeParseGradingJSON, safeParseQuizJSON } from './schemas';

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function resizeAndCompressImage(file, maxWidth = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.onerror = (err) => reject(new Error('Failed to load image for resizing', { cause: err }));
    };
    reader.onerror = (err) => reject(new Error('Failed to read file', { cause: err }));
  });
}

export const FALLBACK_MODELS_TEXT = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-pro-exp-02-05',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'groq/llama-3.3-70b-versatile',
  'deepseek/deepseek-chat',
  'zai/glm-4-flash'
];

export const FALLBACK_MODELS_VISION = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-pro-exp-02-05',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'groq/llama-3.2-11b-vision-preview',
  'zai/glm-4v-flash'
];

async function executeAICall({ model, prompt, base64Image, useSearch = false, timeoutMs = 60000 }) {
  // 1. Determine provider
  let provider = 'gemini';
  let modelName = model;
  if (model.startsWith('groq/')) {
    provider = 'groq';
    modelName = model.replace('groq/', '');
  } else if (model.startsWith('deepseek/')) {
    provider = 'deepseek';
    modelName = model.replace('deepseek/', '');
  } else if (model.startsWith('zai/')) {
    provider = 'zai';
    modelName = model.replace('zai/', '');
  }

  // 2. Get API key from localStorage
  let apiKey = '';
  if (provider === 'gemini') {
    apiKey = localStorage.getItem('gemini_api_key') || '';
  } else if (provider === 'groq') {
    apiKey = localStorage.getItem('groq_api_key') || '';
  } else if (provider === 'deepseek') {
    apiKey = localStorage.getItem('deepseek_api_key') || '';
  } else if (provider === 'zai') {
    apiKey = localStorage.getItem('zai_api_key') || '';
  }

  if (!apiKey) {
    throw new Error(`API key for ${provider} is not configured.`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const body = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      };
      if (base64Image) {
        body.contents[0].parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        });
      }
      if (useSearch) {
        body.tools = [{ googleSearch: {} }];
      }

      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `Gemini API call failed for ${modelName}`);
      }

      const result = await response.json();
      return result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    } else {
      // OpenAI compatible endpoints (Groq, DeepSeek, Z.ai/Zhipu)
      let url = '';
      if (provider === 'groq') {
        url = 'https://api.groq.com/openai/v1/chat/completions';
      } else if (provider === 'deepseek') {
        url = 'https://api.deepseek.com/chat/completions';
      } else if (provider === 'zai') {
        url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };

      let messages = [];
      if (base64Image) {
        messages = [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ];
      } else {
        messages = [
          { role: 'user', content: prompt }
        ];
      }

      const body = {
        model: modelName,
        messages,
        temperature: 0.1
      };

      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `API call failed for ${modelName}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function callWithFallbackText(prompt, useSearch = false, timeoutMs = 60000) {
  let lastError = null;
  for (const model of FALLBACK_MODELS_TEXT) {
    try {
      console.log(`Attempting AI call using model: ${model}`);
      const text = await executeAICall({ model, prompt, useSearch, timeoutMs });
      if (text) return text;
    } catch (err) {
      console.warn(`Model ${model} failed:`, err.message || err);
      lastError = err;
    }
  }
  throw new Error(`All fallback models failed. Last error: ${lastError?.message || lastError}`);
}

export async function callWithFallbackVision(prompt, base64Image, timeoutMs = 60000) {
  let lastError = null;
  for (const model of FALLBACK_MODELS_VISION) {
    try {
      console.log(`Attempting Vision AI call using model: ${model}`);
      const text = await executeAICall({ model, prompt, base64Image, timeoutMs });
      if (text) return text;
    } catch (err) {
      console.warn(`Vision model ${model} failed:`, err.message || err);
      lastError = err;
    }
  }
  throw new Error(`All fallback vision models failed. Last error: ${lastError?.message || lastError}`);
}

export async function parseScreenshotWithGemini(base64Image) {
  const prompt = `You are a data extraction assistant for CAT (Common Admission Test) prep.
Analyze this screenshot. It will be either:
(A) A practice session, set, or drill report (single topic/section).
(B) A full mock test scorecard or sectional mock scorecard (showing overall metrics and/or splits for VARC, LRDI/DILR, and QA/Quant).

Determine which type of screenshot this is and return a raw JSON object matching the appropriate structure.

---
STRUCTURE A: If the screenshot is a practice session, set, or drill report:
{
  "type": "practice",
  "timeTaken": number (minutes spent on the set/passage, parse decimals if present, e.g. 15.5; return null if not visible),
  "attempted": number (total questions attempted or answered),
  "correct": number (total questions correct),
  "label": string (a heading or label for this set/passage, e.g. "Reading Comprehension Scorecard", "RC Passage", "Verbal Ability Drill", or the specific name/topic of the set if visible),
  "section": string (either "VARC" or "LRDI" or "QA"),
  "subsection": string (must be one of: "Verbal Ability", "Reading Comprehension" for VARC; "Logical Reasoning", "Data Interpretation" for LRDI; "Quantitative Ability" for QA),
  "topic": string (the topic name if visible, e.g. "Philosophy", "Economics", "Arrangements", "Arithmetic"),
  "source": string (either "iQuanta", "Cracku", "IMS Portal", "IMS mock", "New test series", "Self practice", or "Other"),
  "difficulty": string (either "Easy" or "Medium" or "Hard")
}

Normalization rules for Structure A:
1. "attempted": If not explicitly listed, count the questions attempted (can be computed as correct + incorrect).
2. "correct": If not explicitly listed, count the questions correct (can be computed as attempted - incorrect).

---
STRUCTURE B: If the screenshot is a full mock test scorecard or a sectional mock scorecard:
{
  "type": "mock",
  "overallScore": number (overall score, e.g., 125, if visible),
  "overallPercentile": number (overall percentile, e.g., 97.22, if visible),
  "source": string (either "IMS", "SimCAT", "AIMCAT", "Cracku", "iQuanta", or "Other"),
  "label": string (a specific mock test label if visible, e.g., "SimCAT 7", "AIMCAT 2501"),
  "sections": {
    "VARC": {
      "attempted": number (or null if not shown),
      "correct": number (or null if not shown),
      "timeTaken": number (minutes, or null if not shown)
    },
    "LRDI": {
      "attempted": number (or null if not shown),
      "correct": number (or null if not shown),
      "timeTaken": number (minutes, or null if not shown)
    },
    "QA": {
      "attempted": number (or null if not shown),
      "correct": number (or null if not shown),
      "timeTaken": number (minutes, or null if not shown)
    }
  }
}

Scoring Estimation Rules for Structure B:
If the scorecard lists sectional scores (marks) or percentiles but not attempts/corrects (e.g., in Verbal/VARC the score is 54; in LRDI/DILR the score is 38; in QA the score is 33), you MUST estimate "attempted" and "correct" for each section based on the marks using the standard CAT scoring (+3 for correct, -1 for wrong).
Assume a default high accuracy (100% or close) as a baseline:
- If a section score is 54, set: attempted: 18, correct: 18 (since 18 * 3 = 54).
- If a section score is 33, set: attempted: 11, correct: 11 (since 11 * 3 = 33).
- If a section score is 38 (not divisible by 3), estimate: attempted: 14, correct: 13 (since 13 * 3 - 1 = 38).
- For timeTaken, set it to the standard CAT sectional limit: 40 minutes per section (VARC: 40, LRDI: 40, QA: 40) if time is not explicitly visible or is shown as standard CAT duration.

Do not write markdown block tags (like \`\`\`json). Return ONLY the raw JSON string.`;

  const text = await callWithFallbackVision(prompt, base64Image, 60000);
  const parsed = safeParseScreenshotJSON(text);
  return sanitizeParsedDetails(parsed);
}

export async function defineWordWithGemini(word) {
  const prompt = `Define the word "${word}" in the context of CAT (Common Admission Test) vocabulary.
Provide a concise definition and a key synonym in exactly one short line (e.g. "Meticulous: showing great attention to detail; precise (Syn: diligent)").
Do not include markdown bold or block tags. Keep the definition under 14 words.`;

  const text = await callWithFallbackText(prompt, false, 30000);
  return text.trim();
}

export function sanitizeParsedDetails(parsed) {
  if (!parsed || typeof parsed !== 'object') return {};

  const cleanNum = (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return val;
    // Extract first numeric match (including decimals)
    const match = String(val).match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
  };

  const cleanStr = (val) => {
    if (!val) return '';
    return String(val).trim();
  };

  const result = { ...parsed };

  // Normalize structure type
  result.type = cleanStr(parsed.type).toLowerCase() === 'mock' ? 'mock' : 
                 cleanStr(parsed.type).toLowerCase() === 'sectional' ? 'sectional' : 'practice';

  // Normalize single practice fields
  if (result.type === 'practice') {
    result.timeTaken = cleanNum(parsed.timeTaken);
    result.attempted = cleanNum(parsed.attempted);
    result.correct = cleanNum(parsed.correct);
    result.label = cleanStr(parsed.label);
    
    // Normalize section
    let sec = cleanStr(parsed.section).toUpperCase();
    if (sec.includes('VARC') || sec.includes('VERBAL') || sec.includes('READING')) sec = 'VARC';
    else if (sec.includes('LR') || sec.includes('DI') || sec.includes('LOGICAL') || sec.includes('INTERP')) sec = 'LRDI';
    else if (sec.includes('QA') || sec.includes('QUANT') || sec.includes('MATH')) sec = 'QA';
    result.section = sec;
  }

  // Normalize mock scorecard fields
  if (result.type === 'mock' || result.type === 'sectional') {
    result.overallScore = cleanNum(parsed.overallScore);
    result.overallPercentile = cleanNum(parsed.overallPercentile);
    result.source = cleanStr(parsed.source);
    result.label = cleanStr(parsed.label);

    if (parsed.sections && typeof parsed.sections === 'object') {
      result.sections = {};
      const keys = ['VARC', 'LRDI', 'QA'];
      for (const k of keys) {
        // Find if key exists in different cases or variants (e.g. "VARC", "Varc", "Verbal")
        const matchKey = Object.keys(parsed.sections).find(
          pk => pk.toUpperCase().includes(k) || 
                (k === 'VARC' && pk.toUpperCase().includes('VERB')) ||
                (k === 'LRDI' && (pk.toUpperCase().includes('LR') || pk.toUpperCase().includes('DI'))) ||
                (k === 'QA' && pk.toUpperCase().includes('QUAN'))
        );

        if (matchKey && parsed.sections[matchKey]) {
          const s = parsed.sections[matchKey];
          result.sections[k] = {
            attempted: cleanNum(s.attempted),
            correct: cleanNum(s.correct),
            timeTaken: cleanNum(s.timeTaken)
          };
        }
      }
    }
  }

  return result;
}

export async function gradeAeonSummaryWithGemini(articleTitle, articleLink, userSummary) {
  const prompt = `You are a verbal ability expert grading a student's summary of this article.
Article Title: "${articleTitle}"
Article Link: "${articleLink}"

Your task:
1. Visit/read the article using the provided link to understand its core arguments, structure, and tone.
2. Evaluate the student's summary:
   - Summary: "${userSummary}"
3. Grade their summary's accuracy (score from 0 to 100). The target is 80%.
4. Determine if they met the 80% comprehension target.
5. List 2-3 specific strengths (what core arguments they successfully captured).
6. List 2-3 omissions or misunderstandings (what main arguments they missed, oversimplified, or got wrong).
7. Provide one short piece of actionable reading advice for this type of essay.

Fallback instructions:
If you cannot browse or access the link (e.g. paywall, robot limits), evaluate their summary based on your existing knowledge of the article title "${articleTitle}" and topic. Do not fail.

Return ONLY a raw JSON object matching this schema. No markdown block tags (like \`\`\`json).
{
  "score": number,
  "status": "Target Met (≥80%)" | "Target Missed (<80%)",
  "strengths": ["string"],
  "omissions": ["string"],
  "advice": "string"
}`;

  const text = await callWithFallbackText(prompt, true, 60000);
  return safeParseGradingJSON(text);
}

export async function generateAeonQuizWithGemini(articleTitle, articleLink) {
  const prompt = `You are a CAT (Common Admission Test) verbal ability (VARC) reading comprehension expert.
Generate a high-quality Reading Comprehension (RC) quiz based on this article.
Article Title: "${articleTitle}"
Article Link: "${articleLink}"

Your task:
1. Retrieve/read the article using the provided link.
2. Generate exactly 8 multiple-choice questions testing active comprehension.
3. Keep the questions at CAT level of difficulty, using the authentic language, tone, and structural complexity of actual CAT VARC questions.
4. Ensure a good variation of question types. The 8 questions should cover:
   - 2 Central Idea / Primary Purpose / Main Theme questions.
   - 1 Tone / Attitude / Style of the author question.
   - 3 Inference / Assumption / Suggestion-based questions (e.g., "Which of the following can be inferred...", "The author's argument assumes which of the following...").
   - 1 Weaken / Strengthen / Application-based question (e.g., "Which of the following, if true, would most weaken the author's claim that...", "According to the passage, the author's view on X would be supported by...").
   - 1 Structure / Organization / Function-based question (e.g., "The primary function of the second paragraph is to...", "Which of the following best describes the organization of the passage?").
5. For each question, construct 4 option choices (A, B, C, D):
   - Only 1 must be correct, representing a nuanced but indisputably correct interpretation.
   - The other 3 options must be highly realistic CAT-style traps that feel correct but contain subtle flaws.
   - Classify and detail the traps in the JSON response using these specific CAT trap tags:
     * "Out of Scope" (extrapolated ideas not stated in the passage)
     * "True but Irrelevant" (historically or textually true, but doesn't answer the specific question stem)
     * "Extreme Language" (uses absolute words like "always", "never", "only", "entirely" when the author was moderate)
     * "Too Broad / Too Narrow" (captures only a minor detail or goes far beyond the scope of the paragraph)
     * "Direct Distortion" (takes facts from the passage but twists their causal relationship or context)
6. For each question:
   - "question": Question text matching CAT VARC register.
   - "options": { "A": "...", "B": "...", "C": "...", "D": "..." }
   - "correctOption": "A" | "B" | "C" | "D"
   - "explanation": Nuanced, detailed reasoning for why the correct option is the best answer.
   - "traps": {
       "A": "Identify the trap type and explain why it is wrong...",
       "B": "Identify the trap type and explain why it is wrong...",
       "C": "Identify the trap type and explain why it is wrong...",
       "D": "Identify the trap type and explain why it is wrong..."
     } (For the correctOption, the trap description should be "Correct Option - no trap.")

Fallback instructions:
If you cannot browse or access the link, generate a custom high-quality CAT RC passage of ~500 words on the same topic/title ("${articleTitle}") and generate the 8 questions from that passage! The quiz must not fail.

Return ONLY a raw JSON array matching the schema. No markdown block tags (like \`\`\`json).`;

  const text = await callWithFallbackText(prompt, true, 60000);
  return safeParseQuizJSON(text);
}


