export interface Env {
  AI: Ai;
  DB: D1Database;
  PDFS: R2Bucket;
  PAPER_WORKFLOW: Workflow<{ paperId: string }>;
}
