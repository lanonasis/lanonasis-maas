import MemoryList from '@/components/memory/MemoryList';

export default function MemoryDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🧠 Memory Explorer</h1>
      <MemoryList />
    </div>
  );
}