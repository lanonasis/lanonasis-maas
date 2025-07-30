import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL=https://<project-ref>.supabase.co

export async function GET() {
  const { data, error } = await supabase
    .from('memory_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  return new Response(JSON.stringify(data), { status: 200 });
}