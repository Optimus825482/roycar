// ─── API Response Types ───

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: { total: number; page: number; pageSize: number };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

// ─── Wizard Types ───

export interface WizardState {
  formConfigId: bigint;
  questions: WizardQuestion[];
  branchingRules: WizardBranchingRule[];
  currentQuestionIndex: number;
  questionPath: number[];
  answers: Record<string, Answer>;
  mode: "static" | "dynamic";
}

export interface WizardQuestion {
  id: number;
  groupLabel: string | null;
  questionText: string;
  questionType: string;
  isRequired: boolean;
  sortOrder: number;
  options: unknown;
  validation: unknown;
  metadata: unknown;
  images: {
    id: number;
    filePath: string;
    fileName: string;
    sortOrder: number;
  }[];
}

export interface WizardBranchingRule {
  id: number;
  sourceQuestionId: number;
  targetQuestionId: number;
  conditionLogic: "AND" | "OR";
  conditions: Condition[];
  priority: number;
}

export interface Condition {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "in";
  value: string | string[];
}

export type Answer = string | string[] | File | null;

// ─── Evaluation Types ───

export interface EvaluationReport {
  overallScore: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  fitAnalysis: string;
  recommendation: "shortlist" | "interview" | "reject";
  recommendationReason: string;
}
