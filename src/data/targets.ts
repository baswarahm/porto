/* PLACEHOLDERS: replace with real targets. */
export interface Step { text: string; done: boolean }
export interface Target { title: string; label: string; due: string; steps: Step[] }

export const targets: Record<'doing' | 'next' | 'done', Target[]> = {
  doing: [
    { title: 'Finish year 1 with a strong CGPA', label: 'uni', due: 'jun 2027', steps: [
      { text: 'Never miss a lab', done: true },
      { text: 'Weekly review every Sunday', done: true },
      { text: 'Ace the semester 1 finals', done: false },
      { text: 'Ace the semester 2 finals', done: false },
    ] },
    { title: 'Solve 100 data-structure problems in C++', label: 'dsa', due: 'mar 2027', steps: [
      { text: 'Arrays and strings (25)', done: false },
      { text: 'Linked lists and stacks (25)', done: false },
      { text: 'Trees and graphs (25)', done: false },
      { text: 'Dynamic programming (25)', done: false },
    ] },
  ],
  next: [
    { title: 'Join my first hackathon', label: 'build', due: '2027', steps: [
      { text: 'Find a team', done: false }, { text: 'Ship something in 48 hours', done: false },
    ] },
    { title: 'Build an ML project for Intelligent Computing', label: 'ai', due: '2027', steps: [
      { text: 'Finish an intro ML course', done: false }, { text: 'Pick a real dataset', done: false }, { text: 'Train, evaluate, write it up', done: false },
    ] },
    { title: 'Land a strong industrial training placement (CFC453)', label: 'career', due: '2030', steps: [
      { text: 'CV and portfolio ready', done: true }, { text: '3 solid projects', done: false }, { text: 'Apply to 20 places', done: false },
    ] },
  ],
  done: [
    { title: 'Get into a CS degree', label: 'uni', due: '2026', steps: [
      { text: 'Finish SMA', done: true }, { text: 'Get accepted at USM', done: true },
    ] },
    { title: 'Rebuild my portfolio from scratch', label: 'build', due: 'oct 2026', steps: [
      { text: 'Astro + TypeScript', done: true }, { text: 'Real curriculum and progress', done: true }, { text: 'Interactive everything', done: true },
    ] },
  ],
};

export const targetColumns = [
  { key: 'doing', title: 'in progress' },
  { key: 'next', title: 'next up' },
  { key: 'done', title: 'done' },
] as const;
