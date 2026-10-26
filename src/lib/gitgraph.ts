/* ==========================================================================
   GITGRAPH.TS — turns a newest-first commit list into `git log --graph`
   style ASCII rows. Runs at build time; the page ships plain HTML.
   Main is lane 0 and always drawn; every other lane is open between its
   newest and oldest commit, then forks off main with a "/".
   ========================================================================== */
import type { Commit, Lane } from '../data/courses';

export interface Cell { ch: string; lane: Lane | null }
export interface GraphRow { kind: 'commit' | 'fork'; lane: Lane; cells: Cell[]; commit?: Commit }

export function buildGraph(commits: Commit[], laneCount = 5): GraphRow[] {
  const first: Partial<Record<Lane, number>> = {};
  const last: Partial<Record<Lane, number>> = {};
  commits.forEach((c, i) => {
    if (first[c.lane] === undefined) first[c.lane] = i;
    last[c.lane] = i;
  });
  const lanes = Array.from({ length: laneCount }, (_, i) => i as Lane);
  // a side lane shows "|" on rows strictly between its newest and oldest commit
  const open = (l: Lane, i: number) => first[l] !== undefined && i > first[l]! && i < last[l]!;

  const rows: GraphRow[] = [];
  commits.forEach((c, i) => {
    rows.push({
      kind: 'commit', lane: c.lane, commit: c,
      cells: lanes.map(l => l === c.lane ? { ch: '*', lane: l } : l === 0 ? { ch: '|', lane: 0 } : open(l, i) ? { ch: '|', lane: l } : { ch: ' ', lane: null }),
    });
    for (const b of lanes){
      if (b === 0 || last[b] !== i) continue;
      rows.push({
        kind: 'fork', lane: b,
        cells: lanes.map(l => l === 0 ? { ch: '|', lane: 0 } : l === b ? { ch: '/', lane: l } : open(l, i) ? { ch: '|', lane: l } : { ch: ' ', lane: null }),
      });
    }
  });
  return rows;
}
