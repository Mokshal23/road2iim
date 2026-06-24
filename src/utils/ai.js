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

async function callGeminiModel(modelName, base64Image, apiKey) {
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
                mimeType: 'image/png', // Gemini handles png/jpeg automatically
                data: base64Image,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `Gemini API request failed for ${modelName}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Clean text in case Gemini still wraps in markdown block
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

export async function parseScreenshotWithGemini(base64Image, apiKey) {
  try {
    // Try Gemini 2.5 Flash first
    return await callGeminiModel('gemini-2.5-flash', base64Image, apiKey);
  } catch (err2_5) {
    console.warn('Gemini 2.5 Flash failed, trying fallback to Gemini 1.5 Flash:', err2_5);
    try {
      // Fallback to Gemini 1.5 Flash (highly stable, higher free limits)
      return await callGeminiModel('gemini-1.5-flash', base64Image, apiKey);
    } catch (err1_5) {
      console.error('Gemini 1.5 Flash fallback failed:', err1_5);
      // Throw the primary error to show to the user, or explain both failed
      throw new Error(err2_5.message || 'Gemini API call failed', { cause: err1_5 });
    }
  }
}

async function callGeminiText(modelName, prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || `API call failed for ${modelName}`);
  }

  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function defineWordWithGemini(word, apiKey) {
  const prompt = `Define the word "${word}" in the context of CAT (Common Admission Test) vocabulary.
Provide a concise definition and a key synonym in exactly one short line (e.g. "Meticulous: showing great attention to detail; precise (Syn: diligent)").
Do not include markdown bold or block tags. Keep the definition under 14 words.`;

  try {
    const text = await callGeminiText('gemini-2.5-flash', prompt, apiKey);
    return text.trim();
  } catch (err2_5) {
    console.warn('Gemini 2.5 Flash vocab definition failed, trying 1.5 Flash:', err2_5);
    try {
      const text = await callGeminiText('gemini-1.5-flash', prompt, apiKey);
      return text.trim();
    } catch (err1_5) {
      console.error('Gemini 1.5 Flash vocab definition failed:', err1_5);
      throw new Error(err2_5.message || 'Failed to fetch definition', { cause: err1_5 });
    }
  }
}

