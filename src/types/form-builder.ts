// ─── Form Builder Frontend Types ───

export interface FormListItem {
  id: string;
  title: string;
  mode: "static" | "dynamic";
  isPublished: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    questions: number;
    applications: number;
  };
}

export interface QuestionImage {
  id: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  sortOrder: number;
}

export interface FormQuestion {
  id: string;
  formConfigId: string;
  groupLabel: string | null;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  sortOrder: number;
  options: string[] | null;
  validation: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  images: QuestionImage[];
  createdAt: string;
  updatedAt: string;
}

export type QuestionType =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "file";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Kısa Metin",
  textarea: "Uzun Metin",
  select: "Açılır Liste",
  radio: "Tek Seçim",
  checkbox: "Çoklu Seçim",
  date: "Tarih",
  file: "Dosya Yükleme",
};

export interface BranchingRule {
  id: string;
  sourceQuestionId: string;
  targetQuestionId: string;
  conditionLogic: "AND" | "OR";
  conditions: RuleCondition[];
  priority: number;
}

export interface RuleCondition {
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

export interface FormDetail {
  id: string;
  title: string;
  mode: "static" | "dynamic";
  isPublished: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  questions: FormQuestion[];
  branchingRules: BranchingRule[];
}

export interface ValidationResult {
  isValid: boolean;
  deadEnds: { questionId: string; questionText: string }[];
  cycles: { path: string[] }[];
  orphans: { questionId: string; questionText: string }[];
  warnings: string[];
}
