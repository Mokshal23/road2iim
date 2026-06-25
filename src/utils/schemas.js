import { z } from 'zod';

// Screenshot schemas
export const PracticeScreenshotSchema = z.object({
  type: z.literal('practice'),
  timeTaken: z.number().nullable().default(null),
  attempted: z.number().default(0),
  correct: z.number().default(0),
  label: z.string().default('Practice session'),
  section: z.enum(['VARC', 'LRDI', 'QA']).default('VARC'),
});

export const SectionMetricsSchema = z.object({
  attempted: z.number().default(0),
  correct: z.number().default(0),
  timeTaken: z.number().default(0),
});

export const MockScreenshotSchema = z.object({
  type: z.literal('mock'),
  overallScore: z.number().default(0),
  overallPercentile: z.number().default(0),
  source: z.string().default('SimCAT'),
  label: z.string().default('Mock Test'),
  date: z.string().nullable().default(null),
  sections: z.object({
    VARC: SectionMetricsSchema.default({}),
    LRDI: SectionMetricsSchema.default({}),
    QA: SectionMetricsSchema.default({}),
  }).default({}),
});

export const ScreenshotSchema = z.discriminatedUnion('type', [
  PracticeScreenshotSchema,
  MockScreenshotSchema,
]);

// Summary Grading Schema
export const SummaryGradingSchema = z.object({
  score: z.number().min(0).max(100).default(50),
  status: z.string().default('Target Missed (<80%)'),
  strengths: z.array(z.string()).default([]),
  omissions: z.array(z.string()).default([]),
  advice: z.string().default('Try to focus on the author\'s main arguments and tone in future readings.'),
});

// Quiz Schema
export const QuizQuestionSchema = z.object({
  question: z.string().default('Nuanced CAT-level RC question'),
  options: z.object({
    A: z.string().default('Option A'),
    B: z.string().default('Option B'),
    C: z.string().default('Option C'),
    D: z.string().default('Option D'),
  }),
  correctOption: z.enum(['A', 'B', 'C', 'D']).default('A'),
  explanation: z.string().default('Nuanced elimination reasoning for the correct option.'),
  traps: z.object({
    A: z.string().default('Out of Scope'),
    B: z.string().default('True but Irrelevant'),
    C: z.string().default('Extreme Language'),
    D: z.string().default('Direct Distortion'),
  }),
});

export const QuizSchema = z.array(QuizQuestionSchema);

// Safe parsing utilities with self-healing defaults
export function safeParseScreenshotJSON(text) {
  try {
    const cleanText = extractJSONBlock(text);
    const raw = JSON.parse(cleanText);
    const parsed = ScreenshotSchema.safeParse(raw);
    if (parsed.success) return parsed.data;

    // Direct fallback mapping
    if (raw.type === 'mock') {
      return MockScreenshotSchema.parse(raw);
    } else {
      return PracticeScreenshotSchema.parse(raw);
    }
  } catch (err) {
    console.warn('Screenshot parsing failed, returning default practice session template:', err);
    return {
      type: 'practice',
      timeTaken: null,
      attempted: 0,
      correct: 0,
      label: 'Practice session (Auto-parsed fallback)',
      section: 'VARC',
    };
  }
}

export function safeParseGradingJSON(text) {
  try {
    const cleanText = extractJSONBlock(text);
    const raw = JSON.parse(cleanText);
    return SummaryGradingSchema.parse(raw);
  } catch (err) {
    console.warn('Grading parsing failed, returning default evaluation:', err);
    return {
      score: 50,
      status: 'Target Missed (<80%)',
      strengths: ['Captured some key vocabulary.'],
      omissions: ['Omitted key details due to parsing exception.'],
      advice: 'Ensure your summary captures structural transitions of the essay.',
    };
  }
}

export function safeParseQuizJSON(text) {
  try {
    const cleanText = extractJSONBlock(text);
    const raw = JSON.parse(cleanText);
    if (!Array.isArray(raw)) throw new Error('Expected JSON array for quiz.');

    return raw.map((q) => {
      const traps = q.traps || {};
      const correctOpt = q.correctOption || 'A';

      const cleanTraps = {
        A: traps.A || (correctOpt === 'A' ? 'Correct Option - no trap.' : 'Out of Scope'),
        B: traps.B || (correctOpt === 'B' ? 'Correct Option - no trap.' : 'True but Irrelevant'),
        C: traps.C || (correctOpt === 'C' ? 'Correct Option - no trap.' : 'Extreme Language'),
        D: traps.D || (correctOpt === 'D' ? 'Correct Option - no trap.' : 'Direct Distortion'),
      };

      return QuizQuestionSchema.parse({
        ...q,
        traps: cleanTraps,
      });
    });
  } catch (err) {
    console.error('Quiz parsing failed:', err);
    throw new Error('The AI generated a malformed quiz format. Please try regenerating.', { cause: err });
  }
}

// Cleans markdown code-block enclosures (e.g. ```json ... ```)
function extractJSONBlock(text) {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    const lines = clean.split('\n');
    if (lines[0].startsWith('```')) lines.shift();
    if (lines[lines.length - 1] === '```') lines.pop();
    clean = lines.join('\n').trim();
  }
  return clean;
}
