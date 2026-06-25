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

// === Pre-Flight Database Write Schemas ===

export const VocabItemSchema = z.object({
  word: z.string().trim().min(1, "Vocab word cannot be empty"),
  meaning: z.string().trim().default(''),
  mastered: z.boolean().default(false),
});

export const EntryWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  date: z.string().min(1, "Date is required"),
  section: z.enum(['VARC', 'LRDI', 'QA']),
  subsection: z.string().min(1, "Subsection is required"),
  topic: z.string().trim().default('General'),
  label: z.string().trim().default(''),
  timeTaken: z.preprocess((val) => Number(val), z.number().positive("Time taken must be positive")),
  attempted: z.preprocess((val) => Number(val), z.number().int().nonnegative("Attempted must be a non-negative integer")),
  correct: z.preprocess((val) => Number(val), z.number().int().nonnegative("Correct must be a non-negative integer")),
  negativeMarking: z.boolean().default(true),
  source: z.string().min(1, "Source is required"),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
  mistakeTags: z.array(z.string()).default([]),
  goodTags: z.array(z.string()).default([]),
  notes: z.string().trim().default(''),
  vocab: z.array(VocabItemSchema).default([]),
  flagged: z.boolean().default(false),
  sessionId: z.string().uuid().optional(),
  sessionSeq: z.number().int().nonnegative().optional(),
}).refine((data) => data.correct <= data.attempted, {
  message: "Correct answers cannot exceed attempted questions",
  path: ["correct"],
});

export const GoalWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  text: z.string().trim().min(1, "Goal description is required"),
  section: z.enum(['VARC', 'LRDI', 'QA']),
  targetHours: z.preprocess((val) => Number(val), z.number().positive("Target hours must be positive")),
  deadline: z.string().min(1, "Deadline date is required"),
});

export const TodoWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  text: z.string().trim().min(1, "Todo description is required"),
  dueDate: z.string().min(1, "Due date is required"),
  done: z.boolean().default(false),
  createdAt: z.string().optional(),
});

export const ReminderWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  text: z.string().trim().min(1, "Reminder text is required"),
  date: z.string().min(1, "Date is required"),
  dismissed: z.boolean().default(false),
});

export const MockTestSectionSchema = z.object({
  attempted: z.preprocess((val) => Number(val), z.number().int().nonnegative("Attempted must be a non-negative integer")),
  correct: z.preprocess((val) => Number(val), z.number().int().nonnegative("Correct must be a non-negative integer")),
  timeTaken: z.preprocess((val) => Number(val), z.number().positive("Time taken must be positive")),
}).refine((data) => data.correct <= data.attempted, {
  message: "Correct answers cannot exceed attempted questions",
  path: ["correct"],
});

export const MockTestWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  overallScore: z.preprocess((val) => Number(val), z.number("Overall score must be a number")),
  overallPercentile: z.preprocess((val) => Number(val), z.number().min(0).max(100, "Percentile must be between 0 and 100")),
  source: z.string().min(1, "Source is required"),
  label: z.string().trim().min(1, "Mock label is required"),
  date: z.string().min(1, "Date is required"),
  sections: z.object({
    VARC: MockTestSectionSchema,
    LRDI: MockTestSectionSchema,
    QA: MockTestSectionSchema,
  }),
  notes: z.string().trim().default(''),
  flagged: z.boolean().default(false),
});

export const AeonArticleWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  title: z.string().trim().min(1, "Title is required"),
  topic: z.string().trim().default('General'),
  summary: z.string().trim().min(1, "Summary is required"),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).default('Medium'),
  vocab: z.array(VocabItemSchema).default([]),
  link: z.string().trim().default(''),
  timeTaken: z.preprocess((val) => Number(val), z.number().int().nonnegative().default(0)),
  wordCount: z.preprocess((val) => Number(val), z.number().int().nonnegative().default(0)),
  readingSpeed: z.preprocess((val) => Number(val), z.number().int().nonnegative().default(0)),
  content: z.string().trim().default(''),
  summaryGrade: z.any().nullable().optional(),
  quiz: z.any().nullable().optional(),
  quizHighScore: z.preprocess((val) => Number(val), z.number().int().nonnegative().default(0)),
  vocabMastery: z.record(z.any()).default({}),
  date: z.string().min(1, "Date is required"),
});

export const CommentWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  date: z.string().nullable().default(null),
  text: z.string().trim().min(1, "Comment text cannot be empty"),
  linkedEntryLabel: z.string().trim().default(''),
  author: z.enum(['mentor', 'student']),
  parentId: z.string().nullable().default(null),
  createdAt: z.string().min(1, "Creation timestamp is required"),
});

export const TaskWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  text: z.string().trim().min(1, "Task description is required"),
  section: z.enum(['VARC', 'LRDI', 'QA', 'General']),
  dueDate: z.string().nullable().default(null),
  status: z.enum(['pending', 'done']).default('pending'),
  createdAt: z.string().min(1, "Creation timestamp is required"),
  completedAt: z.string().nullable().default(null),
});

export const VocabDirectWriteSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  word: z.string().trim().min(1, "Vocab word cannot be empty"),
  meaning: z.string().trim().default(''),
  mastered: z.boolean().default(false),
  createdAt: z.string().min(1, "Creation timestamp is required"),
});

// Helper validation functions
export function validateWrite(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errorMsg = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`Validation failed: ${errorMsg}`);
  }
  return result.data;
}
