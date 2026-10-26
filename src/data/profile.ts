export const profile = {
  name: 'Baswara Hafizh Muttaqin',
  firstName: 'Baswara Hafizh',
  lastName: 'Muttaqin',
  brand: 'BASWARA.HM',
  title: 'CS (Intelligent Computing) Student — USM',
  description:
    'Baswara Hafizh Muttaqin — CS (Intelligent Computing) student at Universiti Sains Malaysia. An ordinary person from Solo who loves to code and learn.',
  location: 'Surakarta, Central Java, Indonesia',
  tagline: 'Computer Science (Intelligent Computing) · USM',
  intro:
    '“rakyat biasa dari Solo” — an ordinary person who loves to learn. CS (Intelligent Computing) student at Universiti Sains Malaysia.',
  level: 'LV. 01 · FRESHMAN',
  avatar: '/images/dadas.jpeg',
  footerRoute: 'Solo, Indonesia → Penang, Malaysia',
  email: 'baswarahafizh@gmail.com',
};

export const heroBadges = [
  { short: 'AS', title: 'Airsoft podiums' },
  { short: 'ML', title: 'Mobile Legends placements' },
  { short: 'SC', title: 'Science Castle Asia — Bronze' },
];

export const heroStats = [
  { value: 10, label: 'Competition results' },
  { value: 4, label: 'Arenas competed in' },
  { value: 2, label: 'Years in student leadership' },
];

export const about = {
  paragraphs: [
    'Undergraduate CS (Intelligent Computing) student at Universiti Sains Malaysia, originally from Solo, Indonesia. Drawn to the ways technology and economics shape the world around us.',
    'Still early in the technical journey, but learns fast and never shies away from the unfamiliar.',
  ],
  traits: ['Problem Solver', 'Risk Taker', 'Economics Enthusiast', 'Tech Enthusiast', 'Adaptable', 'Morning Person'],
  hud: [
    { k: 'Origin', v: 'Solo, Indonesia' },
    { k: 'Faction', v: 'USM · Intelligent Computing' },
    { k: 'Status', v: 'Seeking first project opportunity' },
  ],
};

export const socials = [
  { label: 'Email me', icon: '✉', href: `mailto:${profile.email}` },
  { label: 'LinkedIn', icon: 'in', href: 'https://www.linkedin.com/in/baswara-hafizh-muttaqin-68a7b4329/' },
  { label: 'Instagram', icon: '◎', href: 'https://instagram.com/baswara.hm' },
  { label: 'Discord', icon: '◆', href: 'https://discord.gg/3PHBSJscNe' },
  { label: 'GitHub', icon: '⌥', href: 'https://github.com/baswarahm' },
];

export const partOf = [
  { name: 'Debe Solo', href: 'https://instagram.com/debesolo', logo: '/images/logos/debe-solo.jpg' },
  { name: 'Al Ikhlas Stationery', href: 'https://instagram.com/alikhlas.stationery', logo: '/images/logos/al-ikhlas-stationery.png' },
];

/** Section ids in page order — drives nav, mini-map, memory labels and the command palette. */
export const sections = [
  { id: 'hero', label: 'Hero', nav: false },
  { id: 'about', label: 'About', nav: true },
  { id: 'skills', label: 'Skills', nav: true },
  { id: 'quest-log', label: 'Quest Log', nav: true },
  { id: 'projects', label: 'Projects', nav: true },
  { id: 'contact', label: 'Contact', nav: true },
] as const;
