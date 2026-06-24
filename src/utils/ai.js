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

export async function parseScreenshotWithGemini(base64Image, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are a data extraction assistant for CAT (Common Admission Test) prep. Analyze this screenshot of a practice session, scorecard, or drill report.
Extract the details and return a raw JSON object matching the following structure:
{
  "timeTaken": number (minutes spent on the set/passage, parse decimals if present, e.g. 15.5; return null or empty if not visible),
  "attempted": number (total questions attempted or answered),
  "correct": number (total questions correct),
  "label": string (a heading or label for this set/passage, e.g. "Reading Comprehension Scorecard", "RC Passage", "Verbal Ability Drill", or the specific name/topic of the set if visible),
  "section": string (either "VARC" or "LRDI" or "QA"),
  "subsection": string (must be one of: "Verbal Ability", "Reading Comprehension" for VARC; "Logical Reasoning", "Data Interpretation" for LRDI; "Quantitative Ability" for QA),
  "topic": string (the topic name if visible, e.g. "Philosophy", "Economics", "Arrangements", "Arithmetic"),
  "source": string (either "iQuanta", "Cracku", "IMS Portal", "IMS mock", "New test series", "Self practice", or "Other"),
  "difficulty": string (either "Easy" or "Medium" or "Hard")
}

Normalization rules:
1. "attempted": If not explicitly listed, count the questions attempted (can be computed as correct + incorrect).
2. "correct": If not explicitly listed, count the questions correct (can be computed as attempted - incorrect).
3. "section" and "subsection": Determine the section and subsection based on the text. For example, if it says "Reading Comprehension" or lists "Passage", set "section" to "VARC" and "subsection" to "Reading Comprehension". If it lists "Verbal Ability" or tasks like Para Jumbles, set "section" to "VARC" and "subsection" to "Verbal Ability".
4. "label": Create a concise heading summarizing the set (e.g. "Reading Comprehension Scorecard" or the section header name).
5. "source": Infer from logos or names if visible (e.g., IMS scorecard -> "IMS Portal", iQuanta -> "iQuanta"). Default to "Other" if not identifiable.

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
    throw new Error(err.error?.message || 'Gemini API request failed');
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Clean text in case Gemini still wraps in markdown block
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}
