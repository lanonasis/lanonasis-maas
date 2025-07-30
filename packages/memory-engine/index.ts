import { createClient } from '@supabase/supabase-js';
import { embedText } from './utils/embedder';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export async function saveMemory({ title, content, type = 'context', user_id }: {
  title: string;
  content: string;
  type?: string;
  user_id: string;
}) {
  const embedding = await embedText(content);
  return supabase.from('memory_entries').insert({
    title,
    content,
    memory_type: type,
    embedding,
    user_id
  });
}

export async function searchMemory(query: string, user_id: string) {
  const embedding = await embedText(query);
  const { data } = await supabase.rpc('match_memories', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5,
    user_id
  });
  return data;
}