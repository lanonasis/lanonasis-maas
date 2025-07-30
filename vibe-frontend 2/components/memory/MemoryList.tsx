'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function MemoryList() {
  const { data, error, isLoading } = useSWR('/api/memory/list', fetcher);

  if (isLoading) return <p>Loading memory...</p>;
  if (error) return <p>Error loading memory</p>;

  return (
    <div className="space-y-4">
      {data?.map((memory: any) => (
        <div key={memory.id} className="p-4 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold">{memory.title}</h2>
          <p className="text-sm text-gray-500">{memory.memory_type}</p>
          <p className="mt-2">{memory.content}</p>
          <p className="text-xs text-gray-400 mt-1">Last Accessed: {memory.last_accessed}</p>
        </div>
      ))}
    </div>
  );
}