export interface TimelineItem {
  date: string;
  title: string;
  org: string;
  body: string;
  tag: string;
  /** still going: shows a live progress bar (degree progress for education) */
  ongoing?: boolean;
}

export const experience: TimelineItem[] = [
  {
    date: '2025', tag: 'award', title: 'Bronze Medal — Science Castle Asia', org: 'Multimedia University (MMU), Malaysia',
    body: 'Presented a research-based science project at an international competition and placed third overall.',
  },
  {
    date: '2024–2025', tag: 'leadership', title: 'Chairman, Commission 1', org: 'MPK Student Representative Council',
    body: "Drafted the council's regulations and kept them up to date as the student body's needs changed.",
  },
  {
    date: '2023–2025', tag: 'events', title: 'Field Coordinator & Competition Committee', org: 'Al Azhar Creativity Project (ACP 4.0 & 5.0)',
    body: 'Coordinated field operations on event days and served on the competition committee across two consecutive editions of ACP.',
  },
  {
    date: '2023–2024', tag: 'leadership', title: 'Member, Commission 2', org: 'MPK Student Representative Council',
    body: 'Oversaw and monitored the student council (OSIS), and wrote reports on its activities to evaluate how well it was performing.',
  },
];

export const education: TimelineItem[] = [
  {
    date: '2026–2030', tag: 'degree', title: 'B.CS (Intelligent Computing) with Honours', org: 'Universiti Sains Malaysia, Penang',
    body: 'Computer Science with a concentration in Intelligent Computing: machine learning, NLP, computer vision and computational intelligence.',
    ongoing: true,
  },
  {
    date: '2023–2026', tag: 'high school', title: 'Senior High School', org: 'SMA Al-Azhar Syifa Budi Solo',
    body: 'Completed senior high school in Solo, alongside organizational work and competition seasons.',
  },
  {
    date: '2020–2023', tag: 'junior high', title: 'Junior High School', org: 'SMP Al-Azhar Syifa Budi Solo',
    body: 'Completed junior high school in Solo.',
  },
];
