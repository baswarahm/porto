export interface Project {
  title: string;
  status: string;
  description: string;
  tags: string[];
  repo?: string;
  live?: string;
}

export const projects: Project[] = [
  {
    title: 'Split Bill',
    status: 'Shipped',
    description:
      'Scan a receipt with Gemini, fix anything the scan got wrong, tap who ate what, and share a per-person breakdown — tax and service charge split fairly — as an image for the group chat.',
    tags: ['React', 'TypeScript', 'Tailwind', 'Gemini API', 'Vercel'],
    // TODO: fill in once split-bill's own repo / deploy URL is confirmed
    repo: undefined,
    live: undefined,
  },
];
