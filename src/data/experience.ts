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
    date: '2025', tag: 'award', title: 'Bronze Medal, Science Castle Asia', org: 'Multimedia University (MMU), Malaysia',
    body: 'Presented a research project at Science Castle Asia, an international science competition for students, and won bronze.',
  },
  {
    date: '2024–2025', tag: 'leadership', title: 'Chairman, Commission 1', org: 'MPK Student Representative Council',
    body: "Led the commission that wrote the council's regulations, and revised them when the student body needed changes.",
  },
  {
    date: '2023–2025', tag: 'events', title: 'Field Coordinator & Competition Committee', org: 'Al Azhar Creativity Project (ACP 4.0 & 5.0)',
    body: 'Handled field coordination on event days and helped run the competitions, two editions in a row.',
  },
  {
    date: '2023–2024', tag: 'leadership', title: 'Member, Commission 2', org: 'MPK Student Representative Council',
    body: 'Monitored the student council (OSIS) and wrote reports on how its programs went.',
  },
];

export const education: TimelineItem[] = [
  {
    date: '2026 – now', tag: 'degree', title: 'B.CS (Intelligent Computing) with Honours', org: 'Universiti Sains Malaysia, Penang',
    body: 'Computer Science, specialising in Intelligent Computing: machine learning, NLP, computer vision and computational intelligence.',
    ongoing: true,
  },
  {
    date: '2023–2026', tag: 'high school', title: 'Senior High School', org: 'SMA Al-Azhar Syifa Budi Solo',
    body: 'High school in Surakarta. A lot of it went into the student council and competitions.',
  },
  {
    date: '2020–2023', tag: 'junior high', title: 'Junior High School', org: 'SMP Al-Azhar Syifa Budi Solo',
    body: 'Junior high school in Surakarta.',
  },
];
