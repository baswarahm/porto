export interface Shot { src: string; alt: string; label: string }

/** one tool inside a project's tour: a tab in the showcase dialog */
export interface Tool {
  id: string;
  name: string;
  /** course it belongs to, e.g. "CCA102 · Computer Organisation" */
  course: string;
  blurb: string;
  points: string[];
  /** more than one shot shows small switches under the screenshot */
  shots: Shot[];
}

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
  /** the live demo is down for now: no link, a "under maintenance" tag instead */
  maintenance?: string;
  /** "take the tool tour" dialog */
  showcase?: {
    intro: string;
    /** how and when the project keeps growing */
    updates: string;
    tools: Tool[];
  };
  /** the site is invite-only: no public link, visitors are asked to DM instead */
  access?: { note: string; cta: string; href: string };
}

const shot = (file: string, alt: string, label: string): Shot =>
  ({ src: `/images/projects/revision-lab/${file}.webp`, alt, label });

export const projects: Project[] = [
  {
    slug: 'revision-lab',
    title: 'Revision Lab',
    year: '2026',
    description: 'A revision site I made for my CS batch at USM, with step-by-step solvers, a C++ scratchpad and a question generator.',
    stack: 'html · css · js · supabase',
    details: [
      'Step-by-step solvers that lay out the working the way our lecturers do',
      'A C++ scratchpad and a question generator marked by a real compiler',
      'Interactive labs for logic and graphs, plus mock tests and past papers',
      'I add the new courses every semester, so it grows with my batch',
    ],
    showcase: {
      intro: 'I built these while taking the courses myself, so my batch can check their working without waiting for answer keys.',
      updates: 'Updated every semester as my batch moves up. Right now: Year 1 Semester 1 (CCA101, CCA102, CKC111).',
      tools: [
        {
          id: 'solvers',
          name: 'Step-by-step solvers',
          course: 'CCA102 · Computer Organisation',
          blurb: 'Type any numbers and get the full working, table by table, laid out the way the lecturer shows it. Every tool updates as you type.',
          points: [
            "Booth's algorithm, add-shift multiplication and restoring division, cycle by cycle",
            "Base conversion, signed representations and 2's complement add / subtract with overflow checks",
            'IEEE 754 (32-bit) encoding and CPI / MIPS / execution time',
          ],
          shots: [
            shot('booth', "Booth's algorithm solver showing each cycle of A, Q and Q-1", "Booth's algorithm"),
            shot('base-conversion', 'Base conversion and signed representation solvers', 'Base conversion'),
            shot('ieee754', 'IEEE 754 encoder and CPI / MIPS calculator', 'IEEE 754 & CPI'),
          ],
        },
        {
          id: 'scratchpad',
          name: 'C++ scratchpad',
          course: 'CCA101 · Principles of Programming',
          blurb: 'Write any C++ program, type the keyboard input for cin, and run it with g++ 13 right in the browser. No install, works on any laptop in the lab.',
          points: [
            'Real g++ 13 compile, with the output and exit code',
            'A stdin box, so programs that use cin just work',
            'Ctrl + Enter to run, one click to reset',
          ],
          shots: [shot('scratchpad', 'C++ scratchpad running a loop program with its output', 'Run a program')],
        },
        {
          id: 'generator',
          name: 'Question generator',
          course: 'CCA101 · Principles of Programming',
          blurb: 'Each click makes a new CodeRunner-style question with a random theme, random numbers and new hidden tests, in the same partial-program format as our assessment.',
          points: [
            'Ten question types across sequence, selection, repetition and files',
            'Answers are marked by a compiler against hidden tests',
            'Each question has a code, so a friend can open exactly the same one',
          ],
          shots: [
            shot('generator', 'Question generator with topic and type pickers', 'Pick a topic'),
            shot('generated-question', 'A generated switch-menu question with an answer editor', 'A fresh question'),
          ],
        },
        {
          id: 'graph-lab',
          name: 'Graph lab',
          course: 'CKC111 · Discrete Structures',
          blurb: 'Type the edges of any graph and it draws it, then works out the degrees, neighbourhoods, graph type and adjacency list and matrices.',
          points: [
            'Directed and undirected graphs, loops and multiple edges',
            'Dijkstra tables worked out step by step',
            'One-click examples taken from the lecture slides',
          ],
          shots: [shot('graph-lab', 'Graph lab drawing a graph next to its degree table', 'Draw & analyse')],
        },
        {
          id: 'logic-lab',
          name: 'Logic lab',
          course: 'CKC111 · Discrete Structures',
          blurb: 'Flip switches to see when a statement is true. You try the logic first, then get the truth tables.',
          points: [
            'Interactive implication, connectives and truth-table labs',
            'Practice sets that check your answer straight away',
            'A weekly checkpoint and a timed mock paper',
          ],
          shots: [shot('logic-lab', 'Logic lab with switches for p and q and the result of p implies q', 'Flip the switches')],
        },
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
    description: 'Scan a receipt, tap who ate what, and send everyone their share.',
    stack: 'react · ts · gemini',
    details: [
      'Gemini reads every line item, tax and service charge from a photo of the receipt',
      'You fix anything the scan got wrong before splitting',
      'Tax and service charge are shared in proportion to what each person ate',
      'Exports the result as an image for the group chat',
    ],
    maintenance: 'The demo is down for maintenance. It will be back soon.',
  },
];
