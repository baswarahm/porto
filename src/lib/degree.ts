/* Degree progress maths, shared by the build (first paint) and the browser
   (live value), so the page is right on day one and stays right after. */
import { degree } from '../data/courses';

export interface Semester { index: number; label: string; fill: number; state: 'done' | 'now' | 'future' }

export function degreeProgress(now = Date.now()){
  const start = +new Date(degree.start), end = +new Date(degree.end);
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  const pct = clamp((now - start) / (end - start));
  const semLen = (end - start) / degree.semesters;
  const current = Math.min(degree.semesters - 1, Math.max(0, Math.floor((now - start) / semLen)));
  const semesters: Semester[] = Array.from({ length: degree.semesters }, (_, i) => ({
    index: i,
    label: `Y${Math.floor(i / 2) + 1} · S${(i % 2) + 1}`,
    fill: clamp((now - start - i * semLen) / semLen),
    state: i < current ? 'done' : i === current ? 'now' : 'future',
  }));
  return { pct, current, semesters, year: Math.floor(current / 2) + 1, sem: (current % 2) + 1 };
}

export const textBar = (n: number, width = 20) => '█'.repeat(Math.round(n * width)).padEnd(width, '░');
