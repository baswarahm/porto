export type SkillStatus = 'active' | 'learning';
export interface Skill { name: string; pct: number; status: SkillStatus }
export interface SkillGroup { category: string; skills: Skill[] }

export const skillGroups: SkillGroup[] = [
  {
    category: 'Languages',
    skills: [
      { name: 'Python', pct: 60, status: 'active' },
      { name: 'JavaScript', pct: 50, status: 'active' },
      { name: 'C++', pct: 40, status: 'active' },
    ],
  },
  {
    category: 'Tools',
    skills: [
      { name: 'GitHub', pct: 55, status: 'active' },
      { name: 'Docker', pct: 35, status: 'learning' },
      { name: 'Kali Linux', pct: 35, status: 'learning' },
    ],
  },
  {
    category: 'Design',
    skills: [
      { name: 'CSS / Tailwind', pct: 45, status: 'active' },
      { name: 'Figma', pct: 50, status: 'active' },
      { name: 'Canva', pct: 65, status: 'active' },
    ],
  },
];
