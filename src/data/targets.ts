/* PLACEHOLDERS: replace with real targets. */
export interface Target { title: string; label: string; due: string; progress?: string }

export const targets: Record<'doing' | 'next' | 'done', Target[]> = {
  doing: [
    { title: 'Finish year 1 with a strong CGPA', label: 'uni', due: 'jun 2027' },
    { title: 'Solve 100 data-structure problems in C++', label: 'dsa', due: 'mar 2027', progress: '12 / 100' },
  ],
  next: [
    { title: 'Join my first hackathon', label: 'build', due: '2027' },
    { title: 'Build an ML project for Intelligent Computing', label: 'ai', due: '2027' },
    { title: 'Land a software engineering internship', label: 'career', due: '2028' },
  ],
  done: [
    { title: 'Ship my first real web app (Split Bill)', label: 'build', due: 'oct 2026' },
    { title: 'Get into a CS degree', label: 'uni', due: '2026' },
  ],
};

export const targetColumns = [
  { key: 'doing', title: 'in progress' },
  { key: 'next', title: 'next up' },
  { key: 'done', title: 'done' },
] as const;
