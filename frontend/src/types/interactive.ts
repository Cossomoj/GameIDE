export interface Variant {
  id: string;
  title: string;
  description: string;
}

export interface Step {
  stepId: string;
  name: string;
  description: string;
  variants: Variant[];
}

export interface GameState {
  gameId: string;
  currentStep: number;
  totalSteps: number;
  step: Step;
  isActive: boolean;
  isPaused?: boolean;
  completedSteps: number;
  startedAt?: string;
  lastActivityAt?: string;
}

export interface StartInteractiveGenerationResponse {
  success: boolean;
  data: {
    gameId: string;
    currentStep: number;
    totalSteps: number;
    step: Step;
  };
  message: string;
}

export interface GetInteractiveStateResponse {
  success: boolean;
  data: GameState;
}

export interface SelectVariantResponse {
  success: boolean;
  message: string;
  data: {
    selectedVariant: string;
    nextStep?: Step;
  };
}

export interface CompleteInteractiveGenerationResponse {
  success: boolean;
  data: {
    gameId: string;
    finalGamePath: string;
    downloadUrl: string;
    assets?: string[];
    choices?: Array<{
      step: string;
      choice: string;
    }>;
  };
  message: string;
} 