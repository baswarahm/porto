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
  /** a short status beside the week, e.g. "mid-sem break" */
  status?: string;
  learned: string[];
  doing: string[];
  /** what comes after the break */
  next?: string[];
  stuck?: string;
}

/* From the official course planners (semester I, 2026/2027). Week 8 is the
   mid-semester break (16–22 Nov 2026). */
export const courses: Course[] = [
  {
    code: 'CCA101', name: 'Programming Fundamentals', lane: 1, week: 8, weeks: 15, status: 'mid-sem break',
    learned: ['C++ basics: I/O, variables, arithmetic', 'Problem solving with pseudocode and flowcharts', 'Selection: if, nested if, switch', 'Loops: while, for, do-while, nested', 'Text file input/output and formatting'],
    doing: ['Report-based programming assessment (due 13 Dec)'],
    next: ['Functions, reference and pointer parameters', 'Arrays (1D, 2D) and pointers'],
  },
  {
    code: 'CKC111', name: 'Discrete Structures', lane: 2, week: 8, weeks: 16, status: 'mid-sem break',
    learned: ['Logic and proofs', 'Basic algorithms', 'Relations', 'Graphs: connectivity and shortest paths', 'Trees: traversal and minimum spanning trees'],
    doing: ['Resting before part 2 of the course'],
    next: ['Sets, functions, sequences, sums and matrices', 'Induction and recursion, counting'],
  },
  {
    code: 'CCA102', name: 'Computer Organisation', lane: 3, week: 8, weeks: 15, status: 'mid-sem break',
    learned: ['Number systems and computer arithmetic', 'Boolean algebra, gates, combinational circuits', 'Flip-flops, registers, counters', 'Memory addressing and instruction types', 'Addressing modes and instruction formats'],
    doing: ['Resting before the CPU chapters'],
    next: ['CPU, control unit, I/O', 'Memory, cache and virtual memory'],
  },
  {
    code: 'SELF', name: 'Self-study: web + blockchain', lane: 4,
    learned: ['Rebuilt this site in Astro + TypeScript', 'three.js and WebGL for the 3D world', 'Git branching'],
    doing: ['Blockchain fundamentals: consensus, multi-chain architecture, VMs', 'Keeping this site up to date every semester'],
    next: ['Then a build track: L1 development, interoperability, VM customization or applications'],
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
  { lane: 4, hash: 'b3e91f', msg: 'rebuild this site as a one-page 3D world', date: 'nov 2026', ref: 'HEAD',
    notes: ['three.js network, hologram, firewall you can break', 'the git graph you are reading is built at compile time'] },
  { lane: 3, hash: '4c2a7e', msg: 'test 1: number systems to addressing', date: '12 nov 2026' },
  { lane: 1, hash: '9d10b5', msg: 'timed programming assessment 1', date: '11 nov 2026',
    notes: ['control structures and file processing', 'report-based assessment released the same day'] },
  { lane: 1, hash: 'e7f203', msg: 'text files: input, output, formatting', date: 'week 7' },
  { lane: 3, hash: '61ab9c', msg: 'addressing modes + instruction formats', date: 'week 7' },
  { lane: 2, hash: 'a58d14', msg: 'trees: traversal, spanning trees, mst', date: 'week 7',
    notes: ['tutorial cw#1 submitted'] },
  { lane: 2, hash: '0f6ce2', msg: 'graphs: connectivity + shortest paths', date: 'week 6' },
  { lane: 3, hash: 'c91e30', msg: 'memory locations, addressing, instruction types', date: 'week 6',
    notes: ['assignment 1 submitted'] },
  { lane: 1, hash: '2b8f47', msg: 'test 1: up to loops', date: '3 nov 2026' },
  { lane: 2, hash: 'd4730a', msg: 'test 1: logic, proofs, algorithms', date: 'week 5' },
  { lane: 3, hash: '87e5d1', msg: 'flip-flops, registers, counters', date: 'week 5' },
  { lane: 1, hash: '5fa0c8', msg: 'loops: while, for, do-while, nested', date: 'week 5–6' },
  { lane: 3, hash: 'f12b6d', msg: 'boolean algebra, gates, combinational circuits', date: 'week 4',
    notes: ['multiplexers, decoders, PLA, ROM'] },
  { lane: 1, hash: '3e9d21', msg: 'selection: if, nested if, switch', date: 'week 4' },
  { lane: 2, hash: '76c4b0', msg: 'relations + basic algorithms', date: 'week 3–4' },
  { lane: 3, hash: 'aa0e53', msg: 'binary, hex, integer + floating point', date: 'week 2–3' },
  { lane: 2, hash: '1d8f9e', msg: 'logic and proofs', date: 'week 1–2' },
  { lane: 1, hash: '6b2e07', msg: 'hello, c++: first program + pseudocode', date: 'week 1–3' },
  { lane: 0, hash: '3f2a0b', msg: 'enrol: b.cs intelligent computing @ USM', date: 'sep 2026', ref: 'tag: year-1' },
  { lane: 0, hash: '91d4c6', msg: 'graduate SMA Al-Azhar Syifa Budi Solo', date: '2026', ref: 'tag: sma' },
];
