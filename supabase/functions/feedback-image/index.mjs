import { imageHandler } from './handler.mjs';
const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
Deno.serve(imageHandler({
  origin: Deno.env.get('SUPABASE_URL'),
  secret: keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
}));
