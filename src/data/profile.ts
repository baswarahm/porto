export const profile = {
  name: 'Baswara Hafizh Muttaqin',
  nameLines: ['Baswara', 'Hafizh', 'Muttaqin'],
  handle: 'baswara',
  title: 'First-year CS (Intelligent Computing) student — USM',
  /** browser tab and search-result title: the full name first, so name searches match */
  pageTitle: 'BASWARA HAFIZH MUTTAQIN - Portfolio',
  description:
    'Baswara Hafizh Muttaqin — first-year Computer Science (Intelligent Computing) student at Universiti Sains Malaysia. Progress, courses, what I learn, and what I am aiming for.',
  whoami: { role: 'first-year cs student', where: 'universiti sains malaysia' },
  photo: '/images/dadas.jpeg',
  photoAlt: 'Baswara standing above a sea of clouds at sunrise',
  email: 'baswara@student.usm.my',
};

export const socials = [
  { label: 'linkedin', handle: 'in/baswarahafizh', icon: 'linkedin', href: 'https://www.linkedin.com/in/baswarahafizh/' },
  { label: 'instagram', handle: '@baswara.hm', icon: 'instagram', href: 'https://instagram.com/baswara.hm' },
] as const;

/** Page sections in order. Drives the top nav, vim j/k navigation and `:<id>` commands. */
export const sections = [
  { id: 'top', label: 'top' },
  { id: 'progress', label: 'progress' },
  { id: 'now', label: 'now' },
  { id: 'targets', label: 'targets' },
  { id: 'projects', label: 'projects' },
  { id: 'journey', label: 'journey' },
  { id: 'contact', label: 'contact' },
] as const;
