export const profile = {
  name: 'Baswara Hafizh Muttaqin',
  nameLines: ['Baswara', 'Hafizh', 'Muttaqin'],
  handle: 'baswara',
  title: 'First-year CS (Intelligent Computing) student at USM',
  /** browser tab and search-result title: the full name first, so name searches match */
  pageTitle: 'BASWARA HAFIZH MUTTAQIN - Portfolio',
  description:
    'Baswara Hafizh Muttaqin, a first-year Computer Science (Intelligent Computing) student at Universiti Sains Malaysia. Progress, courses, what I learn, and what I am aiming for.',
  whoami: { role: 'first-year cs student', where: 'universiti sains malaysia' },
  photo: '/images/dadas.jpeg',
  photoAlt: 'Baswara standing above a sea of clouds at sunrise',
  email: 'baswara@student.usm.my',
};

export const socials = [
  { label: 'linkedin', handle: 'in/baswarahafizh', icon: 'linkedin', href: 'https://www.linkedin.com/in/baswarahafizh/' },
  { label: 'instagram', handle: '@baswara.hm', icon: 'instagram', href: 'https://instagram.com/baswara.hm' },
] as const;

/** The site's sections in order, all on the one home page. Drives the top
    nav, the menu, vim j/k and the `:<id>` commands. `id` is the section's
    element id; the old /progress/-style URLs redirect to these anchors. */
export const pages = [
  { id: 'progress', label: 'progress', path: '/#progress', title: 'Degree progress', blurb: 'Where I am in the four-year plan, semester by semester.' },
  { id: 'now', label: 'now', path: '/#now', title: 'Taking this semester', blurb: 'The courses I am in right now and what I have learned from them.' },
  { id: 'targets', label: 'goals', path: '/#targets', title: 'Goals', blurb: 'What I am doing now, what is next and what is done.' },
  { id: 'projects', label: 'projects', path: '/#projects', title: 'Projects', blurb: 'Being rebuilt. Back soon.', soon: true },
  { id: 'journey', label: 'journey', path: '/#journey', title: 'Experience & education', blurb: 'School, university and the things I did along the way.' },
  { id: 'contact', label: 'contact', path: '/#contact', title: 'Say hi', blurb: 'LinkedIn, Instagram or email.' },
] as const;

export type Page = (typeof pages)[number];

/** In-page sections, for j/k on the home page. */
export const sections = [{ id: 'top', label: 'top' }, { id: 'menu', label: 'menu' }] as const;
