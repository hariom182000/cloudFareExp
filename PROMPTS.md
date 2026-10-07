# Prompt history

## 1. Initial brief (to Claude Code)
Assignment: build an AI-powered app on Cloudflare (LLM + workflow + chat UI + memory). Chosen project "PaperPulse": upload a PDF → Worker triggers a Workflow (parse PDF with unpdf → single Llama 3.3 JSON-schema call → save to D1) → chat about the notes, persisted in D1. Constraint: simple working MVP, minimal cost, deployed to Cloudflare.

## 2. Plan approval
Reviewed plan (single Worker + static assets, R2 for PDFs, Workflow, D1) and told Claude to proceed using Cloudflare tooling.

## Runtime prompts (shipped in src/prompts.ts)
- NOTES_SYSTEM_PROMPT: "Senior Principal Engineer" reviewer persona; terse, concrete, never invent, "Not stated in paper", critical trade-offs. Output forced via JSON Schema (`response_format`).
- CHAT_SYSTEM_PROMPT: grounded Q&A, answers only from notes + paper text.

(Append further iteration prompts below.)

## 3. UX + prompt iteration
Asked for: centered loader while processing, a structured system prompt framing the model as a top-tier researcher and teacher, and a cleaner chat UI.
Outcome: structured prompt (ROLE / AUDIENCE / PROCESS / WRITING RULES / OUTPUT CONTRACT) in src/prompts.ts; chat redesigned as a docked panel with suggestion chips.

## 4. Hallucination fix (found by testing on "Attention Is All You Need")
Single-call notes claimed the paper trained with "masked language modeling + next sentence prediction" (BERT, not in the text).
Fix: split into two workflow steps. `extract-facts` copies verbatim facts (temperature 0), then `synthesize-notes` derives everything from those facts. Result: correct specifics (28.4 / 41.8 BLEU, 4000-step warmup).
