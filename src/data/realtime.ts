/* Live "ghosts" (other visitors moving through the network) need a small realtime service.
   Paste a Supabase project's URL and its public anon key here (Project settings → API) to turn
   them on for everyone. Both are meant to be public; nothing personal is ever sent, only a random
   id per open tab and which section it is reading.
   Left empty, ghosts only sync between tabs of the same browser. */
export const realtime = {
  url: '',      // e.g. 'https://abcdefgh.supabase.co'
  anonKey: '',
};
