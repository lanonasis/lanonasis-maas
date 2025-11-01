import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Send, Lightbulb, Bug, Zap } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'feature' | 'bug' | 'improvement' | 'general';

const feedbackTypes = {
  feature: {
    label: 'Feature Request',
    icon: Lightbulb,
    color: 'bg-blue-500',
    description: 'Suggest a new feature or enhancement'
  },
  bug: {
    label: 'Bug Report',
    icon: Bug,
    color: 'bg-red-500',
    description: 'Report a bug or issue'
  },
  improvement: {
    label: 'Improvement',
    icon: Zap,
    color: 'bg-yellow-500',
    description: 'Suggest improvements to existing features'
  },
  general: {
    label: 'General Feedback',
    icon: MessageSquare,
    color: 'bg-green-500',
    description: 'General comments or feedback'
  }
};

export const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [formData, setFormData] = useState({
    type: '' as FeedbackType | '',
    title: '',
    description: '',
    email: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.type || !formData.title || !formData.description) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // In production, this would send to your feedback API
      // For now, we'll simulate the submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create GitHub issue format for developers
      const githubIssueBody = `
**Feedback Type:** ${feedbackTypes[formData.type].label}
**Priority:** ${formData.priority}
**Contact:** ${formData.email || 'Anonymous'}

**Description:**
${formData.description}

---
*Submitted via Lanonasis MaaS Dashboard*
*Timestamp: ${new Date().toISOString()}*
      `.trim();

      console.log('Feedback submitted:', {
        ...formData,
        githubIssueBody
      });

      toast({
        title: "Feedback submitted!",
        description: "Thank you for your feedback. We'll review it soon.",
      });

      // Reset form
      setFormData({
        type: '',
        title: '',
        description: '',
        email: '',
        priority: 'medium'
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Please try again or contact support directly",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedType = formData.type ? feedbackTypes[formData.type] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Feedback & Feature Requests
          </DialogTitle>
          <DialogDescription>
            Help us improve Lanonasis MaaS by sharing your feedback, feature requests, or bug reports.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: FeedbackType) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(feedbackTypes).map(([key, type]) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedType && (
              <p className="text-sm text-gray-600">{selectedType.description}</p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Brief summary of your feedback"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Please provide detailed information about your feedback, feature request, or bug report..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              required
            />
          </div>

          {/* Priority & Email Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <Badge variant="outline" className="text-green-600">Low</Badge>
                  </SelectItem>
                  <SelectItem value="medium">
                    <Badge variant="outline" className="text-yellow-600">Medium</Badge>
                  </SelectItem>
                  <SelectItem value="high">
                    <Badge variant="outline" className="text-red-600">High</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </DialogFooter>
        </form>

        {/* Footer info */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          <p>💡 <strong>Tip:</strong> For urgent issues, contact support directly at support@lanonasis.com</p>
          <p>🔒 Your feedback is valuable and helps us improve the platform for everyone.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};