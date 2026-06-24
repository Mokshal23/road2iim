// Core domain config for the tracker. Change labels here if your CAT
// syllabus breakdown differs — everything else reads from this file.

export const SECTIONS = {
  VARC: {
    key: 'VARC',
    label: 'VARC',
    full: 'Verbal Ability & Reading Comprehension',
    color: '#E8A33D',
    subsections: ['Verbal Ability', 'Reading Comprehension'],
  },
  LRDI: {
    key: 'LRDI',
    label: 'LRDI',
    full: 'Logical Reasoning & Data Interpretation',
    color: '#5B8DEF',
    subsections: ['Logical Reasoning', 'Data Interpretation'],
  },
  QA: {
    key: 'QA',
    label: 'QA',
    full: 'Quantitative Ability',
    color: '#2BB3A3',
    subsections: ['Quantitative Ability'],
  },
};

export const SECTION_LIST = Object.values(SECTIONS);

export const TOPIC_SUGGESTIONS = {
  'Verbal Ability': [
    'Para jumbles', 'Para summary', 'Odd sentence out', 'Sentence correction',
    'Critical reasoning', 'Vocabulary', 'Para completion',
  ],
  'Reading Comprehension': [
    'Economics', 'Business', 'Science & Tech', 'Philosophy', 'History',
    'Sociology', 'Psychology', 'Literature & Arts', 'Politics', 'Environment',
  ],
  'Logical Reasoning': [
    'Arrangements', 'Puzzles', 'Blood relations', 'Syllogisms',
    'Binary logic', 'Games & tournaments', 'Selections', 'Routes & networks',
  ],
  'Data Interpretation': [
    'Tables', 'Bar graphs', 'Line graphs', 'Pie charts', 'Caselets', 'Mixed sets',
  ],
  'Quantitative Ability': [
    'Arithmetic', 'Algebra', 'Geometry & Mensuration', 'Number Systems',
    'Modern Math (P&C, Probability)', 'Logarithms & Functions',
  ],
};

export const MISTAKE_TAGS = [
  'Conceptual gap',
  'Calculation error',
  'Careless mistake',
  'Misread question',
  'Time pressure',
  'Vocab / formula gap',
  'Logic error',
  'Wrong approach',
  'Silly slip',
  'Other',
];

export const POSITIVE_TAGS = [
  'Strong concept clarity',
  'Good time management',
  'Accurate calculation',
  'Smart elimination',
  'Read carefully',
  'Right approach first try',
  'Stayed calm under pressure',
  'Effective skip/triage call',
  'Other',
];

export const SOURCES = [
  'iQuanta',
  'Cracku',
  'IMS Portal',
  'IMS mock',
  'New test series',
  'Self practice',
  'Other',
];

export const MAX_MISTAKE_TAGS = 3;
export const MAX_POSITIVE_TAGS = 3;

export const MOCK_SOURCES = ['SimCAT', 'Cracku', 'IMS Mock', 'Other'];

export const AEON_DIFFICULTY = ['Easy', 'Medium', 'Hard'];

export const TASK_SECTIONS = [...SECTION_LIST.map((s) => s.key), 'General'];

export const TASK_SECTION_META = {
  ...Object.fromEntries(SECTION_LIST.map((s) => [s.key, s])),
  General: { key: 'General', label: 'General', color: '#9aa0ab' },
};

// Seed values only — overwritten the moment you save the editable targets
// form on the Today tab. VARC/Aeon are counted in sets/articles; QA/DILR in hours.
export const DEFAULT_DAILY_TARGETS = {
  varcCount: 4,
  qaHours: 3,
  dilrHours: 5,
  aeonCount: 1,
};

