export interface Project {
  title: string;
  year: string;
  description: string;
  stack: string;
  /** live demo or repo; the row links here when set */
  href?: string;
}

export const projects: Project[] = [
  {
    title: 'Split Bill',
    year: '2026',
    description: 'Scan a receipt, tap who ate what, share a fair per-person split.',
    stack: 'react · ts · gemini',
    href: undefined, // TODO: add the live or repo URL
  },
];
