'use client';

import { useState } from 'react';

export default function AddMemoryForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('context');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/memory/add', {
      method: 'POST',
      body: JSON.stringify({ title, content, type, user_id: 'demo-user' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const result = await res.json();
    setStatus(result.message || 'Saved!');
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg space-y-4">
      <h2 className="text-lg font-semibold">Add New Memory</h2>
      <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded" />
      <textarea placeholder="Content" value={content} onChange={e => setContent(e.target.value)} className="w-full p-2 border rounded" rows={4} />
      <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2 border rounded">
        <option value="context">Context</option>
        <option value="project">Project</option>
        <option value="knowledge">Knowledge</option>
        <option value="reference">Reference</option>
      </select>
      <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
        {loading ? 'Saving...' : 'Save Memory'}
      </button>
      {status && <p className="text-green-500 text-sm mt-2">{status}</p>}
    </form>
  );
}