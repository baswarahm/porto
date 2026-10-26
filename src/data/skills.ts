/* Skills shown as logos only — no percentages.
   `logo` is a simple-icons slug, or 'vscode' (drawn from Tabler, since
   simple-icons no longer ships the VS Code mark). */
export type SkillGroup = 'languages' | 'web & design' | 'frameworks & tools' | 'systems & deploy';

export interface Skill {
  name: string;
  logo: string;
  group: SkillGroup;
  /** where I've used it — shown when the skill is opened */
  usedIn: string;
  learning?: boolean;
}

export const skills: Skill[] = [
  { name: 'C++', logo: 'cplusplus', group: 'languages', usedIn: 'CCA101 Programming Fundamentals' },
  { name: 'Python', logo: 'python', group: 'languages', usedIn: 'scripts and practice problems' },
  { name: 'JavaScript', logo: 'javascript', group: 'languages', usedIn: 'Split Bill and this portfolio' },
  { name: 'TypeScript', logo: 'typescript', group: 'languages', usedIn: 'Split Bill and this portfolio' },

  { name: 'HTML', logo: 'html5', group: 'web & design', usedIn: 'every website I build' },
  { name: 'CSS', logo: 'css', group: 'web & design', usedIn: 'this portfolio, hand-written' },
  { name: 'Tailwind CSS', logo: 'tailwindcss', group: 'web & design', usedIn: 'Split Bill' },
  { name: 'Figma', logo: 'figma', group: 'web & design', usedIn: 'UI mockups before I code' },
  { name: 'Canva', logo: 'canva', group: 'web & design', usedIn: 'posters and presentations' },

  { name: 'Git', logo: 'git', group: 'frameworks & tools', usedIn: 'every project, every day' },
  { name: 'GitHub', logo: 'github', group: 'frameworks & tools', usedIn: 'hosting code and this site' },
  { name: 'React', logo: 'react', group: 'frameworks & tools', usedIn: 'Split Bill' },
  { name: 'Astro', logo: 'astro', group: 'frameworks & tools', usedIn: 'this portfolio' },
  { name: 'VS Code', logo: 'vscode', group: 'frameworks & tools', usedIn: 'my daily editor' },

  { name: 'Linux', logo: 'linux', group: 'systems & deploy', usedIn: 'the terminal, daily' },
  { name: 'Docker', logo: 'docker', group: 'systems & deploy', usedIn: 'containers, still learning', learning: true },
  { name: 'Kali Linux', logo: 'kalilinux', group: 'systems & deploy', usedIn: 'security basics, still learning', learning: true },
  { name: 'Vercel', logo: 'vercel', group: 'systems & deploy', usedIn: 'deploying Split Bill' },
];

export const skillGroups: SkillGroup[] = ['languages', 'web & design', 'frameworks & tools', 'systems & deploy'];
