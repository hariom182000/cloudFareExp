export type PaperStatus = "processing" | "done" | "error";
export type Stage = "parsing" | "analyzing" | "saving";

export interface Notes {
  title: string;
  one_liner: string;
  core_problem: string;
  methodology: string;
  key_findings: string[];
  tradeoffs: string[];
  key_terms: { term: string; definition: string }[];
  suggested_questions: string[];
}

export type SectionKey = "core_problem" | "methodology" | "key_findings" | "tradeoffs";

export const SECTION_LABELS: Record<SectionKey, string> = {
  core_problem: "Core Problem",
  methodology: "Architecture / Methodology",
  key_findings: "Key Findings",
  tradeoffs: "Technical Trade-offs",
};

export interface PaperRow {
  id: string;
  filename: string;
  title: string | null;
  status: PaperStatus;
  stage: Stage | null;
  error: string | null;
  text: string | null;
  notes: string | null; // JSON-encoded Notes
  created_at: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
