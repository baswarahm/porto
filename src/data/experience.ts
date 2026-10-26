export interface Quest {
  id: string;
  date: string;
  title: string;
  org: string;
  body: string;
  /** 0–100; anything below 100 renders as "In Progress". */
  progress: number;
  progressLabel?: string;
}

export const experience: Quest[] = [
  {
    id: 'q1', date: '2024–2025', title: 'Chairman, Commission 1', org: 'MPK Student Representative Council',
    body: 'Led the organizational timeline for Commission 1, keeping leadership transitions and ongoing programs on schedule for the term.',
    progress: 100,
  },
  {
    id: 'q2', date: '2023–2024', title: 'Member, Commission 2', org: 'MPK Student Representative Council',
    body: "Coordinated council programs and kept initiatives aligned with the council's strategic goals.",
    progress: 100,
  },
  {
    id: 'q3', date: '2023–2025', title: 'Field Coordinator & Competition Committee', org: 'Al Azhar Creativity Project (ACP 4.0 & 5.0)',
    body: 'Ran event operations and supervised competitions across two consecutive editions of ACP.',
    progress: 100,
  },
  {
    id: 'q4', date: '2025', title: 'Bronze Medal — Science Castle Asia', org: 'Multimedia University (MMU), Malaysia',
    body: 'Presented a research-based science project at an international competition and placed third overall.',
    progress: 100,
  },
];

export const education: Quest[] = [
  {
    id: 'e1', date: '2026–Present', title: 'Undergraduate, CS (Intelligent Computing)', org: 'Universiti Sains Malaysia',
    body: 'First year of a Computer Science degree with a concentration in Intelligent Computing.',
    progress: 15, progressLabel: '15% through freshman year',
  },
  {
    id: 'e2', date: '2023–2026', title: 'Senior High School', org: 'SMA Al-Azhar Syifa Budi Solo',
    body: 'Completed senior high school in Solo, alongside organizational work and competition seasons.',
    progress: 100,
  },
  {
    id: 'e3', date: '2020–2023', title: 'Junior High School', org: 'SMP Al-Azhar Syifa Budi Solo',
    body: 'Completed junior high school in Solo.',
    progress: 100,
  },
];
