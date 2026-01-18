import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '../utils/cn';

export interface GuidedTourStep {
  id: string;
  title: string;
  description: string;
  selector?: string;
}

interface GuidedTourOverlayProps {
  open: boolean;
  steps: GuidedTourStep[];
  onClose: () => void;
  onComplete: () => void;
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

const HIGHLIGHT_PADDING = 8;
const CALLOUT_WIDTH = 260;

export const GuidedTourOverlay: React.FC<GuidedTourOverlayProps> = ({
  open,
  steps,
  onClose,
  onComplete,
  scrollContainerRef,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const activeStep = steps[stepIndex];

  const updateRect = useCallback(() => {
    if (!activeStep?.selector) {
      setTargetRect(null);
      return;
    }
    const target = document.querySelector(activeStep.selector);
    if (!target) {
      setTargetRect(null);
      return;
    }
    const rect = target.getBoundingClientRect();
    setTargetRect(rect);
  }, [activeStep]);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updateRect();

    const handleReflow = () => updateRect();
    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow);

    const scrollEl = scrollContainerRef?.current;
    if (scrollEl) {
      scrollEl.addEventListener('scroll', handleReflow);
    }

    return () => {
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow);
      if (scrollEl) {
        scrollEl.removeEventListener('scroll', handleReflow);
      }
    };
  }, [open, updateRect, scrollContainerRef]);

  const highlightStyle = useMemo(() => {
    if (!targetRect) return null;
    return {
      top: Math.max(targetRect.top - HIGHLIGHT_PADDING, 8),
      left: Math.max(targetRect.left - HIGHLIGHT_PADDING, 8),
      width: Math.min(targetRect.width + HIGHLIGHT_PADDING * 2, window.innerWidth - 16),
      height: Math.min(targetRect.height + HIGHLIGHT_PADDING * 2, window.innerHeight - 16),
    };
  }, [targetRect]);

  const calloutStyle = useMemo(() => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: CALLOUT_WIDTH,
      } as React.CSSProperties;
    }

    const preferredTop = targetRect.bottom + 16;
    const preferredLeft = targetRect.left;
    const top = Math.min(preferredTop, window.innerHeight - 220);
    const left = Math.min(Math.max(preferredLeft, 12), window.innerWidth - CALLOUT_WIDTH - 12);

    return {
      top,
      left,
      width: CALLOUT_WIDTH,
    } as React.CSSProperties;
  }, [targetRect]);

  const handleNext = () => {
    if (stepIndex >= steps.length - 1) {
      onComplete();
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handlePrev = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  if (!open || steps.length === 0 || !activeStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/65" />
      {highlightStyle && (
        <div
          className="absolute rounded-lg border border-[var(--vscode-focusBorder)] shadow-xl transition-all"
          style={{
            ...highlightStyle,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
          }}
        />
      )}
      <div
        className={cn(
          'absolute rounded-lg border border-[var(--vscode-panel-border)] bg-[var(--vscode-editor-background)] p-4 text-[12px] text-[var(--vscode-editor-foreground)] shadow-2xl'
        )}
        style={calloutStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-[var(--vscode-descriptionForeground)]">
              Step {stepIndex + 1} of {steps.length}
            </p>
            <h3 className="text-[13px] font-semibold">{activeStep.title}</h3>
          </div>
          <button
            className="text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-editor-foreground)]"
            onClick={onClose}
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[12px] text-[var(--vscode-descriptionForeground)]">
          {activeStep.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px]"
            onClick={handlePrev}
            disabled={stepIndex === 0}
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              onClick={onClose}
            >
              Skip
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px] vscode-button"
              onClick={handleNext}
            >
              {stepIndex >= steps.length - 1 ? 'Finish' : 'Next'}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
