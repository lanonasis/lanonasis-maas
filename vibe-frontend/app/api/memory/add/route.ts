import { createClient } from '@supabase/supabase-js';
import { embedText } from '@/lib/embedder';

const supabase = createClient(process.env.SUPABASE_URL=https://<project-ref>.supabase.co

export async function POST(req: Request) {
  const body = await req.json();
  const embedding = await embedText(body.content);

  const { error } = await supabase.from('memory_entries').insert({
    title: body.title,
    content: body.content,
    memory_type: body.type || 'context',
    embedding,
    user_id: body.user_id,
  });

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });
  return new Response(JSON.stringify({ message: 'Memory saved successfully' }), { status: 200 });
}