import { useState, useEffect, useCallback, useRef } from 'react';

export type OnboardingStepId = 'authenticate' | 'create_memory' | 'search' | 'tour';

interface OnboardingState {
  version: number;
  startedAt: string;
  updatedAt: string;
  completedSteps: OnboardingStepId[];
  skipped: boolean;
}

export interface OnboardingStatus {
  state: OnboardingState;
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  shouldShow: boolean;
}

interface UseOnboardingReturn {
  status: OnboardingStatus | null;
  isLoading: boolean;
  refresh: () => void;
  completeStep: (step: OnboardingStepId) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
}

export function useOnboarding(): UseOnboardingReturn {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialRequestDone = useRef(false);

  const postMessage = useCallback((type: string, data?: unknown) => {
    if (window.vscode) {
      window.vscode.postMessage({ type, data });
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'onboardingState') {
        setStatus(message.data as OnboardingStatus);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);

    if (!initialRequestDone.current) {
      postMessage('getOnboardingState');
      initialRequestDone.current = true;
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [postMessage]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    postMessage('getOnboardingState');
  }, [postMessage]);

  const completeStep = useCallback((step: OnboardingStepId) => {
    postMessage('completeOnboardingStep', { step });
  }, [postMessage]);

  const skipOnboarding = useCallback(() => {
    postMessage('skipOnboarding');
  }, [postMessage]);

  const resetOnboarding = useCallback(() => {
    postMessage('resetOnboarding');
  }, [postMessage]);

  return {
    status,
    isLoading,
    refresh,
    completeStep,
    skipOnboarding,
    resetOnboarding
  };
}
