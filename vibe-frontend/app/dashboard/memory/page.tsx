import MemoryList from '@/components/memory/MemoryList';
import AddMemoryForm from '@/components/memory/AddMemoryForm';

export default function MemoryDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🧠 Memory Explorer</h1>
      <AddMemoryForm />
      <MemoryList />
    </div>
  );
}