import * as vscode from 'vscode';

export type OnboardingStepId = 'authenticate' | 'create_memory' | 'search' | 'tour';

export interface OnboardingState {
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

const STORAGE_KEY = 'lanonasis.onboardingState';
const ONBOARDING_VERSION = 1;
const REQUIRED_STEPS: OnboardingStepId[] = [
  'authenticate',
  'create_memory',
  'search',
  'tour'
];

export class OnboardingService {
  private cachedState: OnboardingState | null = null;

  constructor(private readonly globalState: vscode.Memento) {}

  public async getStatus(): Promise<OnboardingStatus> {
    const state = await this.loadState();
    const completedCount = REQUIRED_STEPS.filter((step) => state.completedSteps.includes(step)).length;
    const totalCount = REQUIRED_STEPS.length;
    const isComplete = completedCount === totalCount;
    const shouldShow = !state.skipped && !isComplete;

    return {
      state,
      completedCount,
      totalCount,
      isComplete,
      shouldShow
    };
  }

  public async markStepComplete(step: OnboardingStepId): Promise<OnboardingStatus> {
    const state = await this.loadState();
    if (!REQUIRED_STEPS.includes(step)) {
      return this.getStatus();
    }

    if (!state.completedSteps.includes(step)) {
      const updatedState: OnboardingState = {
        ...state,
        completedSteps: [...state.completedSteps, step],
        updatedAt: new Date().toISOString()
      };
      await this.saveState(updatedState);
    }

    return this.getStatus();
  }

  public async skip(): Promise<OnboardingStatus> {
    const state = await this.loadState();
    const updatedState: OnboardingState = {
      ...state,
      skipped: true,
      updatedAt: new Date().toISOString()
    };
    await this.saveState(updatedState);
    return this.getStatus();
  }

  public async reset(): Promise<OnboardingStatus> {
    const resetState = this.createDefaultState();
    await this.saveState(resetState);
    return this.getStatus();
  }

  private async loadState(): Promise<OnboardingState> {
    if (this.cachedState) {
      return this.cachedState;
    }

    const stored = this.globalState.get<OnboardingState>(STORAGE_KEY);
    const normalized = this.normalizeState(stored);
    if (!stored || stored.version !== ONBOARDING_VERSION) {
      await this.saveState(normalized);
    } else {
      this.cachedState = normalized;
    }

    return normalized;
  }

  private async saveState(state: OnboardingState): Promise<void> {
    this.cachedState = state;
    await this.globalState.update(STORAGE_KEY, state);
  }

  private normalizeState(stored?: OnboardingState): OnboardingState {
    if (!stored || stored.version !== ONBOARDING_VERSION) {
      return this.createDefaultState();
    }

    const completedSteps = Array.isArray(stored.completedSteps)
      ? stored.completedSteps.filter((step): step is OnboardingStepId => REQUIRED_STEPS.includes(step))
      : [];

    return {
      version: ONBOARDING_VERSION,
      startedAt: stored.startedAt || new Date().toISOString(),
      updatedAt: stored.updatedAt || stored.startedAt || new Date().toISOString(),
      completedSteps,
      skipped: Boolean(stored.skipped)
    };
  }

  private createDefaultState(): OnboardingState {
    const now = new Date().toISOString();
    return {
      version: ONBOARDING_VERSION,
      startedAt: now,
      updatedAt: now,
      completedSteps: [],
      skipped: false
    };
  }
}
