/* Brand logos, resolved at build time: simple-icons (CC0) for most marks,
   Tabler's outline mark for VS Code. Only imported by .astro components,
   so none of this reaches the browser bundle. */
import * as si from 'simple-icons';
import vscode from '@tabler/icons/outline/brand-vscode.svg?raw';

type SimpleIcon = { path: string; hex: string };
const icons = si as unknown as Record<string, SimpleIcon | undefined>;
const lookup = (slug: string) => icons['si' + slug.charAt(0).toUpperCase() + slug.slice(1)];

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
