/* ==========================================================================
   COURSES.TS — degree timeline, the full CS curriculum, what I'm taking,
   and what I've learned.
   The curriculum is the official USM B.CS (Intelligent Computing) study
   plan, computer science courses only (university and free modules left out).
   PLACEHOLDERS: learned / doing / stuck items and the commit log are
   examples — replace them with your own.
   ========================================================================== */

export const degree = {
  name: 'B.CS (Intelligent Computing) with Honours',
  school: 'Universiti Sains Malaysia',
  start: '2026-10-05', // TODO: confirm USM semester dates
  end: '2030-07-31',
  semesters: 8,
};

export type Track = 'core' | 'ic' | 'fyp';
export const tracks: Record<Track, { label: string; note: string }> = {
  core: { label: 'core cs', note: 'CCA / CKC courses' },
  ic: { label: 'intelligent computing', note: 'CIC specialisation' },
  fyp: { label: 'project + industry', note: 'CFC final year project and internship' },
};

export interface CurriculumCourse { code: string; name: string; credits: number; track: Track }

const track = (code: string): Track => code.startsWith('CIC') ? 'ic' : code.startsWith('CFC') ? 'fyp' : 'core';
const c = (code: string, name: string, credits = 3): CurriculumCourse => ({ code, name, credits, track: track(code) });

/** index = semester (0 = year 1 semester 1) */
export const curriculum: CurriculumCourse[][] = [
  [c('CCA101', 'Programming Fundamentals'), c('CCA102', 'Computer Organisation'), c('CKC111', 'Discrete Structures')],
  [c('CCA103', 'System Analysis and Design'), c('CKC112', 'Object-Oriented Programming'), c('CKC113', 'Fundamentals of Artificial Intelligence')],
  [c('CCA201', 'Operating Systems'), c('CCA202', 'Database Fundamentals'), c('CKC211', 'Foundations of Software Engineering'), c('CKC212', 'Data Structures')],
  [c('CCA203', 'Network and Data Communications'), c('CKC213', 'Algorithm and Complexity'), c('CKC214', 'Introduction to Security')],
  [c('CKC311', 'Specialized Platform Development'), c('CKC312', 'Human-Computer Interaction'), c('CKC313', 'Computer Graphics and Visualization'), c('CKC314', 'Parallel and Cloud Computing'), c('CIC331', 'Machine Learning')],
  [c('CKC325', 'Project Management'), c('CFC451', 'Final Year Project: Proposal and Analysis'), c('CIC332', 'Natural Language Processing'), c('CIC333', 'Computational Intelligence'), c('CIC334', 'Business Analytics')],
  [c('CKC411', 'Social Issues and Professional Practice'), c('CFC452', 'Final Year Project: Implementation', 5), c('CIC431', 'Internet of Things'), c('CIC432', 'Computer Vision')],
  [c('CFC453', 'Industrial Training', 12)],
];

/** Branch colour slot 1–4 (see .c1–.c4 in global.css). Main is 0. */
export type Lane = 0 | 1 | 2 | 3 | 4;

export interface Course {
  code: string;
  name: string;
  lane: Exclude<Lane, 0>;
  /** current week / total weeks; omit for self-study */
  week?: number;
  weeks?: number;
  learned: string[];
  doing: string[];
  stuck: string;
}

export const courses: Course[] = [
  {
    code: 'CCA101', name: 'Programming Fundamentals', lane: 1, week: 4, weeks: 14,
    learned: ['First C++ program that compiles on the first try', 'Loops, functions and scope'],
    doing: ['Pointers vs references'],
    stuck: 'why my segfault only happens sometimes',
  },
  {
    code: 'CKC111', name: 'Discrete Structures', lane: 2, week: 4, weeks: 14,
    learned: ['Truth tables and logical equivalence', 'Proof by induction'],
    doing: ['Set theory and relations'],
    stuck: 'writing proofs that sound like proofs',
  },
  {
    code: 'CCA102', name: 'Computer Organisation', lane: 3, week: 4, weeks: 14,
    learned: ["Binary, hex and two's complement"],
    doing: ['Logic gates to adders'],
    stuck: 'nothing yet, ask me next week',
  },
  {
    code: 'SELF', name: 'Self-study: Git + web', lane: 4,
    learned: ['Rebuilt this site in Astro + TypeScript', 'Git branching without fear'],
    doing: ['Data structures in C++, ahead of CKC212'],
    stuck: "reading other people's code fast",
  },
];

export interface Commit {
  lane: Lane;
  hash: string;
  msg: string;
  date: string;
  ref?: string;
  /** shown as a "diff" when the commit is opened */
  notes?: string[];
}

/** Newest first, like `git log`. */
export const commits: Commit[] = [
  { lane: 4, hash: 'a91c2e', msg: 'rebuild portfolio in astro + typescript', date: 'oct 2026',
    notes: ['components render from typed data files', 'the git graph you are reading is built at compile time'] },
  { lane: 1, hash: '7f3d10', msg: 'pointers vs references (wip)', date: 'oct 2026',
    notes: ['a reference is an alias, a pointer is an address', '- still mixing up *p and &x under pressure'] },
  { lane: 2, hash: 'c4e8a2', msg: 'proof by induction, finally', date: 'oct 2026',
    notes: ['base case, then assume n, prove n + 1', 'it is recursion, but for proofs'] },
  { lane: 3, hash: '19be44', msg: "two's complement by hand", date: 'oct 2026',
    notes: ['flip the bits, add one', 'why -128 fits in a byte but +128 does not'] },
  { lane: 1, hash: 'e02f9b', msg: 'loops, functions and scope', date: 'oct 2026' },
  { lane: 2, hash: '5d71c0', msg: 'truth tables + logical equivalence', date: 'oct 2026' },
  { lane: 4, hash: 'b8a3f1', msg: 'learn git branching properly', date: 'oct 2026',
    notes: ['branch, commit, merge, rebase', 'this log is shaped like what I learned'] },
  { lane: 1, hash: '0c9e7d', msg: 'hello, world (compiled first try)', date: 'oct 2026' },
  { lane: 0, hash: '3f2a0b', msg: 'enrol: b.cs intelligent computing @ USM', date: 'oct 2026', ref: 'tag: year-1' },
  { lane: 0, hash: '91d4c6', msg: 'graduate SMA Al-Azhar Syifa Budi Solo', date: '2026', ref: 'tag: sma' },
];
