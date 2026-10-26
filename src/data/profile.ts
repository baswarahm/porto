export const profile = {
  name: 'Baswara Hafizh Muttaqin',
  nameLines: ['Baswara', 'Hafizh', 'Muttaqin'],
  handle: 'baswara',
  title: 'First-year CS (Intelligent Computing) student — USM',
  description:
    'Baswara Hafizh Muttaqin — first-year Computer Science (Intelligent Computing) student at Universiti Sains Malaysia. Progress, courses, what I learn, and what I am aiming for.',
  whoami: { role: 'first-year cs student', where: 'universiti sains malaysia' },
  photo: '/images/dadas.jpeg',
  photoAlt: 'Baswara standing above a sea of clouds at sunrise',
  email: 'baswarahafizh@gmail.com',
};

export const socials = [
  { label: 'github', href: 'https://github.com/baswarahm' },
  { label: 'linkedin', href: 'https://www.linkedin.com/in/baswara-hafizh-muttaqin-68a7b4329/' },
  { label: 'instagram', href: 'https://instagram.com/baswara.hm' },
  { label: 'discord', href: 'https://discord.gg/3PHBSJscNe' },
];

/** Page sections in order. Drives the top nav, vim j/k navigation and `:<id>` commands. */
export const sections = [
  { id: 'top', label: 'top' },
  { id: 'progress', label: 'progress' },
  { id: 'now', label: 'now' },
  { id: 'targets', label: 'targets' },
  { id: 'projects', label: 'projects' },
  { id: 'contact', label: 'contact' },
] as const;
