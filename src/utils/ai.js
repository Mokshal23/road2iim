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

async function callGeminiModel(modelName, base64Image, apiKey, timeoutMs = 60000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs); // dynamic timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: base64Image,
                },
              },
            ],
          },
        ],
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Gemini API request failed for ${modelName}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1 || end < start) {
        throw new Error('No valid JSON structure found in Gemini response');
      }
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    } catch (err) {
      console.warn('Raw text parsing failed:', text);
      throw new Error('Failed to parse response JSON from Gemini', { cause: err });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function parseScreenshotWithGemini(base64Image, apiKey) {
  let rawParsed;
  try {
    // Try Gemini 2.5 Flash first with a 60-second timeout
    rawParsed = await callGeminiModel('gemini-2.5-flash', base64Image, apiKey, 60000);
  } catch (err2_5) {
    console.warn('Gemini 2.5 Flash failed or timed out, trying fallback to Gemini 2.0 Flash:', err2_5);
    try {
      // Fallback to Gemini 2.0 Flash
      rawParsed = await callGeminiModel('gemini-2.0-flash', base64Image, apiKey, 60000);
    } catch (err2_0) {
      console.error('Gemini 2.0 Flash fallback failed:', err2_0);
      throw new Error(err2_5.message || 'Gemini API call failed', { cause: err2_0 });
    }
  }

  return sanitizeParsedDetails(rawParsed);
}

async function callGeminiText(modelName, prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API call failed for ${modelName}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function defineWordWithGemini(word, apiKey) {
  const prompt = `Define the word "${word}" in the context of CAT (Common Admission Test) vocabulary.
Provide a concise definition and a key synonym in exactly one short line (e.g. "Meticulous: showing great attention to detail; precise (Syn: diligent)").
Do not include markdown bold or block tags. Keep the definition under 14 words.`;

  try {
    const text = await callGeminiText('gemini-2.5-flash', prompt, apiKey);
    return text.trim();
  } catch (err2_5) {
    console.warn('Gemini 2.5 Flash vocab definition failed, trying 2.0 Flash:', err2_5);
    try {
      const text = await callGeminiText('gemini-2.0-flash', prompt, apiKey);
      return text.trim();
    } catch (err2_0) {
      console.error('Gemini 2.0 Flash vocab definition failed:', err2_0);
      throw new Error(err2_5.message || 'Failed to fetch definition', { cause: err2_0 });
    }
  }
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

async function callGeminiTextWithSearch(modelName, prompt, apiKey, timeoutMs = 60000) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ googleSearch: {} }]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `API call failed for ${modelName}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export async function gradeAeonSummaryWithGemini(articleTitle, articleLink, userSummary, apiKey) {
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

  const callModel = async (model) => {
    const text = await callGeminiTextWithSearch(model, prompt, apiKey, 60000);
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      throw new Error('No valid JSON found in Gemini grading response');
    }
    return JSON.parse(text.substring(start, end + 1));
  };

  try {
    return await callModel('gemini-2.5-flash');
  } catch (err2_5) {
    console.warn('Gemini 2.5 Flash summary grading failed, trying fallback to 2.0 Flash:', err2_5);
    try {
      return await callModel('gemini-2.0-flash');
    } catch (err2_0) {
      console.error('Gemini fallback summary grading failed:', err2_0);
      throw new Error(err2_5.message || 'Summary grading failed', { cause: err2_0 });
    }
  }
}

export async function generateAeonQuizWithGemini(articleTitle, articleLink, apiKey) {
  const prompt = `You are a CAT (Common Admission Test) verbal ability (VARC) reading comprehension expert.
Generate a high-quality Reading Comprehension (RC) quiz based on this article.
Article Title: "${articleTitle}"
Article Link: "${articleLink}"

Your task:
1. Retrieve/read the article using the provided link.
2. Generate exactly 8 multiple-choice questions testing active comprehension.
3. Keep the questions at CAT difficulty, including common traps.
4. The questions should cover:
   - Primary purpose / Central theme.
   - Tone / Attitude of the author.
   - Inference-based questions ("Which of the following can be inferred...", "The author's argument assumes...").
   - Detail-based check or structure organization.
5. For each question:
   - 4 options (A, B, C, D) and exactly 1 correctOption.
   - A detailed "explanation" for why the correct option is right.
   - A detailed "traps" block showing why each incorrect option is wrong (e.g., "Extreme generalization", "Out of scope", "True but irrelevant").

Fallback instructions:
If you cannot browse or access the link, generate a custom high-quality CAT RC passage of ~500 words on the same topic/title ("${articleTitle}") and generate the 8 questions from that passage! The quiz must not fail.

Return ONLY a raw JSON array matching this schema. No markdown block tags (like \`\`\`json).
[
  {
    "question": "Question text...",
    "options": {
      "A": "Option A...",
      "B": "Option B...",
      "C": "Option C...",
      "D": "Option D..."
    },
    "correctOption": "A" | "B" | "C" | "D",
    "explanation": "Why correct...",
    "traps": {
      "A": "Trap analysis...",
      "B": "Trap analysis...",
      "C": "Trap analysis...",
      "D": "Trap analysis..."
    }
  }
]`;

  const callModel = async (model) => {
    const text = await callGeminiTextWithSearch(model, prompt, apiKey, 60000);
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) {
      throw new Error('No valid JSON array found in Gemini quiz response');
    }
    return JSON.parse(text.substring(start, end + 1));
  };

  try {
    return await callModel('gemini-2.5-flash');
  } catch (err2_5) {
    console.warn('Gemini 2.5 Flash quiz generation failed, trying fallback to 2.0: ', err2_5);
    try {
      return await callModel('gemini-2.0-flash');
    } catch (err2_0) {
      console.error('Gemini fallback quiz generation failed:', err2_0);
      throw new Error(err2_5.message || 'Quiz generation failed', { cause: err2_0 });
    }
  }
}


