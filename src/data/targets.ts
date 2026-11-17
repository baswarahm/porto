/* My goals, kept honest: mostly I just want to be happy and chill, and get
   through the semester calmly. Semester dates come from the course planners. */
export interface Step { text: string; done: boolean }
export interface Target { title: string; label: string; due: string; steps: Step[] }

export const targets: Record<'doing' | 'next' | 'done', Target[]> = {
  doing: [
    { title: 'Be happy and chill', label: 'life', due: 'always', steps: [
      { text: 'Enjoy the mid-semester break', done: false },
    ] },
    { title: 'Get through semester 1 calmly', label: 'uni', due: 'jan 2027', steps: [
      { text: 'CCA101 test 1 (3 Nov)', done: true },
      { text: 'CCA101 timed assessment 1 (11 Nov)', done: true },
      { text: 'CKC111 test 1 and tutorial 1', done: true },
      { text: 'CCA102 assignment 1 and test 1 (12 Nov)', done: true },
      { text: 'CCA101 report assessment (13 Dec)', done: false },
      { text: 'Test 2s and assignment 2', done: false },
      { text: 'Final exams', done: false },
    ] },
  ],
  next: [
    { title: 'Year 1, semester 2', label: 'uni', due: '2027', steps: [
      { text: 'Start semester 2', done: false },
    ] },
  ],
  done: [
    { title: 'Start my CS degree at USM', label: 'uni', due: 'sep 2026', steps: [
      { text: 'Finish SMA in Solo', done: true }, { text: 'Move to Penang', done: true }, { text: 'First weeks of classes', done: true },
    ] },
  ],
};

export const targetColumns = [
  { key: 'doing', title: 'in progress' },
  { key: 'next', title: 'next up' },
  { key: 'done', title: 'done' },
] as const;
