import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from './FeedbackModal';
import { MessageSquare } from 'lucide-react';

export const FeedbackButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 shadow-lg hover:shadow-xl transition-all duration-200 bg-white dark:bg-gray-900 border-2"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
      </Button>

      <FeedbackModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};