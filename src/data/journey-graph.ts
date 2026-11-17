/* My experience & education as a git graph, oldest first (git log --graph --reverse).
   main is school → degree; each experience is a branch that forks off and
   merges back into the degree. Used by Journey.astro (the 2D graph) and
   world.ts (the 3D rail). */
import { experience, education, type TimelineItem } from './experience';

export const BRANCHES = ['main', 'council', 'acp', 'research'] as const;

export interface GraphRow {
  item: TimelineItem;
  /** the lane this commit sits on (index into BRANCHES) */
  lane: number;
  /** lines in the top part of the row, from lane a (row top) to lane b (the dot) */
  top: [number, number][];
  /** lanes that keep going below this row's dot */
  below: number[];
  /** a ref label next to the hash */
  ref?: string;
  hash: string;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
};
const find = (list: TimelineItem[], t: string) => list.find(i => (i.title + ' ' + i.org).includes(t))!;

const rows: Omit<GraphRow, 'hash'>[] = [
  { item: find(education, 'Junior'), lane: 0, top: [], below: [0] },
  { item: find(education, 'Senior'), lane: 0, top: [[0, 0]], below: [0] },
  { item: find(experience, 'Commission 2'), lane: 1, top: [[0, 0], [0, 1]], below: [0, 1], ref: 'council' },
  { item: find(experience, 'ACP'), lane: 2, top: [[0, 0], [1, 1], [0, 2]], below: [0, 1, 2], ref: 'acp' },
  { item: find(experience, 'Chairman'), lane: 1, top: [[0, 0], [1, 1], [2, 2]], below: [0, 1, 2] },
  { item: find(experience, 'Bronze'), lane: 3, top: [[0, 0], [1, 1], [2, 2], [0, 3]], below: [0, 1, 2, 3], ref: 'research' },
  { item: find(education, 'B.CS'), lane: 0, top: [[0, 0], [1, 0], [2, 0], [3, 0]], below: [], ref: 'HEAD -> main' },
];

export const graph: GraphRow[] = rows.map(r => ({ ...r, hash: hash(r.item.title + r.item.date) }));
