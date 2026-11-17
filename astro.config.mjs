import { defineConfig } from 'astro/config';

// everything lives on one page now; the old section URLs jump to their anchor
export default defineConfig({
  site: 'https://baswarahm.my.id',
  redirects: {
    '/progress': '/#progress',
    '/now': '/#now',
    '/goals': '/#targets',
    '/projects': '/#projects',
    '/journey': '/#journey',
    '/contact': '/#contact',
  },
});
