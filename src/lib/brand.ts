/* Brand logos, resolved at build time: simple-icons (CC0) for most marks,
   Tabler's outline mark for VS Code. Only imported by .astro components,
   so none of this reaches the browser bundle. */
import * as si from 'simple-icons';
import vscode from '@tabler/icons/outline/brand-vscode.svg?raw';

type SimpleIcon = { path: string; hex: string };
const icons = si as unknown as Record<string, SimpleIcon | undefined>;
/* marks simple-icons doesn't have, from Lobe Icons (MIT, github.com/lobehub/lobe-icons) */
const extra: Record<string, SimpleIcon> = {
  grok: { hex: '000000', path: 'M9.27 15.29l7.978-5.897c.391-.29.95-.177 1.137.272.98 2.369.542 5.215-1.41 7.169-1.951 1.954-4.667 2.382-7.149 1.406l-2.711 1.257c3.889 2.661 8.611 2.003 11.562-.953 2.341-2.344 3.066-5.539 2.388-8.42l.006.007c-.983-4.232.242-5.924 2.75-9.383.06-.082.12-.164.179-.248l-3.301 3.305v-.01L9.267 15.292M7.623 16.723c-2.792-2.67-2.31-6.801.071-9.184 1.761-1.763 4.647-2.483 7.166-1.425l2.705-1.25a7.808 7.808 0 00-1.829-1A8.975 8.975 0 005.984 5.83c-2.533 2.536-3.33 6.436-1.962 9.764 1.022 2.487-.653 4.246-2.34 6.022-.599.63-1.199 1.259-1.682 1.925l7.62-6.815' },
  claudecode: { hex: 'D97757', path: 'M20.998 10.949H24v3.102h-3v3.028h-1.487V20H18v-2.921h-1.487V20H15v-2.921H9V20H7.488v-2.921H6V20H4.487v-2.921H3V14.05H0V10.95h3V5h17.998v5.949zM6 10.949h1.488V8.102H6v2.847zm10.51 0H18V8.102h-1.49v2.847z' },
};
const lookup = (slug: string) => extra[slug] ?? icons['si' + slug.charAt(0).toUpperCase() + slug.slice(1)];

/** inline SVG markup for a brand logo */
export function logoSvg(slug: string, size = 32){
  if (slug === 'vscode'){
    return vscode.replace(/width="24"/, `width="${size}"`).replace(/height="24"/, `height="${size}"`)
      .replace('<svg', '<svg aria-hidden="true" focusable="false"');
  }
  const icon = lookup(slug);
  if (!icon) throw new Error(`Unknown brand logo: ${slug}`);
  return `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor"><path d="${icon.path}"/></svg>`;
}

/** brand colour for hover; near-black brands (GitHub, Vercel) use the page ink */
export function brandColor(slug: string){
  if (slug === 'vscode') return '#007ACC';
  const hex = lookup(slug)?.hex;
  return hex && !['000000', '181717'].includes(hex) ? `#${hex}` : 'var(--ink)';
}

/** raw icon data for drawing a logo onto a canvas (the 3D skills ring);
    `path` is null for VS Code, which is drawn from its initials instead */
export function brandIcon(slug: string){
  const icon = slug === 'vscode' ? null : lookup(slug);
  return { path: icon?.path ?? null, color: brandColor(slug) };
}
