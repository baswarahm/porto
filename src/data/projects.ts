export interface Shot { src: string; alt: string; caption: string }

export interface Project {
  /** used for the showcase dialog's id */
  slug: string;
  title: string;
  year: string;
  description: string;
  stack: string;
  /** shown when the row is opened */
  details: string[];
  /** live demo or repo */
  href?: string;
  /** "see features & screenshots" showcase: one group of features per heading, plus a gallery */
  showcase?: {
    intro: string;
    features: { heading: string; items: string[] }[];
    shots: Shot[];
  };
  /** the site is invite-only: no public link, visitors are asked to DM instead */
  access?: { note: string; cta: string; href: string };
}

const aacShot = (file: string, alt: string, caption: string): Shot =>
  ({ src: `/images/projects/all-about-cs/${file}.webp`, alt, caption });

export const projects: Project[] = [
  {
    slug: 'all-about-cs',
    title: 'All About CS',
    year: '2026',
    description: 'One revision hub for every Year 1 Semester 1 CS course at USM: notes, mock tests, a C++ judge and step-by-step solvers.',
    stack: 'html · css · js · supabase',
    details: [
      'Three course sites behind one hub: Computer Organisation, Discrete Structures and Principles of Programming',
      'Mock tests, past papers with corrected answers and question banks with hundreds of questions',
      'A live "people online" counter, so you can see who else is revising right now',
      'Made for USM CS students; lecturer slides stay private and never leave my computer',
    ],
    showcase: {
      intro: 'Built while taking these courses myself, so every page is the revision I wished I had. Plain HTML, CSS and JavaScript with no build step, and Supabase Realtime for the live counter.',
      features: [
        { heading: 'Computer Organisation · CCA102', items: [
          'Notes for every Test 1 topic, with a read counter per chapter',
          'Last year\'s paper with the answers corrected, plus two mock papers',
          'A random Test 1 that is new every time, from a 308+ question bank',
          'Drills and solvers that show the working, and a scientific / BASE-N calculator',
        ] },
        { heading: 'Discrete Structures · CKC111', items: [
          'Weekly lessons turned into short interactive pages',
          'Practice questions that check your answer straight away',
          'An exam lab and a timed mock paper with a full marking scheme',
          'A graph lab with Dijkstra tables',
        ] },
        { heading: 'Principles of Programming · CCA101', items: [
          'Notes with C++ code you can run in the page',
          'A 321-question Test 1 mock, timed or by topic',
          '134 CodeRunner-style problems marked by a real compiler with hidden tests',
          'A question generator and a g++ 13 scratchpad with keyboard input',
        ] },
        { heading: 'Across the site', items: [
          'Live "people online" counter (Supabase Realtime Presence)',
          'Each course shows when it was last updated and what changed',
          'Progress is saved in your browser, light and dark themes',
        ] },
      ],
      shots: [
        aacShot('hub', 'The All About CS hub with three course cards and a live online counter', 'The hub: pick a course, see who\'s online'),
        aacShot('computer-organisation', 'Computer Organisation revision page with notes and papers', 'Computer Organisation: notes, past paper, mocks, solvers'),
        aacShot('discrete-structures', 'Discrete Structures study guide with weekly lessons', 'Discrete Structures: one week at a time, plus an exam lab'),
        aacShot('principles-of-programming', 'Principles of Programming page with a mock test and coding practice', 'Principles of Programming: mock test, CodeRunner practice, C++ scratchpad'),
      ],
    },
    access: {
      note: 'For USM students only. Want in? DM me on Instagram and I\'ll send you the link.',
      cta: 'DM @baswara.hm',
      href: 'https://ig.me/m/baswara.hm',
    },
  },
  {
    slug: 'split-bill',
    title: 'Split Bill',
    year: '2026',
    description: 'Scan a receipt, tap who ate what, share a fair per-person split.',
    stack: 'react · ts · gemini',
    details: [
      'Gemini reads every line item, tax and service charge from a photo of the receipt',
      'You fix anything the scan got wrong before splitting',
      'Tax and service charge are shared in proportion to what each person ate',
      'Exports the result as an image for the group chat',
    ],
    href: 'https://split-bill-azure.vercel.app',
  },
];
