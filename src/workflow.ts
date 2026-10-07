import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from "cloudflare:workers";
import { extractText, getDocumentProxy } from "unpdf";
import { MAX_PAPER_CHARS } from "./config";
import type { Env } from "./env";
import { FACTS_SCHEMA, FACTS_SYSTEM_PROMPT, NOTES_SCHEMA, NOTES_SYSTEM_PROMPT } from "./prompts";
import { PaperRepository } from "./repositories/papers";
import { generateJson } from "./services/llm";
import type { Notes } from "./types";

type Params = { paperId: string };

const LLM_STEP = {
  retries: { limit: 2, delay: "5 seconds", backoff: "exponential" },
  timeout: "3 minutes",
} as const;

async function parsePdf(bucket: R2Bucket, paperId: string): Promise<string> {
  const obj = await bucket.get(`${paperId}.pdf`);
  if (!obj) throw new Error("PDF not found in R2");
  const pdf = await getDocumentProxy(new Uint8Array(await obj.arrayBuffer()));
  const { text } = await extractText(pdf, { mergePages: true });
  const clean = text.replace(/\s+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  if (clean.length < 200) throw new Error("No extractable text (scanned PDF?)");
  return clean;
}

export class PaperWorkflow extends WorkflowEntrypoint<Env, Params> {
  async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
    const { paperId } = event.payload;
    const papers = new PaperRepository(this.env.DB);

    try {
      // 1. Deterministic PDF -> text. No LLM involved.
      await papers.setStage(paperId, "parsing");
      const text = await step.do("parse-pdf", async () => {
        const clean = await parsePdf(this.env.PDFS, paperId);
        await papers.setText(paperId, clean);
        return clean.slice(0, MAX_PAPER_CHARS);
      });

      // 2. Ground the LLM: extract verbatim facts first (curbs hallucination).
      await papers.setStage(paperId, "analyzing");
      const facts = await step.do("extract-facts", LLM_STEP, async () => {
        const out = await generateJson<{ facts: string[] }>(this.env, {
          messages: [
            { role: "system", content: FACTS_SYSTEM_PROMPT },
            { role: "user", content: `PAPER TEXT:\n\n${text}` },
          ],
          schema: FACTS_SCHEMA,
          maxTokens: 3000,
          temperature: 0,
        });
        return out.facts.map((f) => `- ${f}`).join("\n");
      });

      // 3. Write structured notes from the facts.
      const notes = await step.do("synthesize-notes", LLM_STEP, () =>
        generateJson<Notes>(this.env, {
          messages: [
            { role: "system", content: NOTES_SYSTEM_PROMPT },
            { role: "user", content: `EXTRACTED FACTS:\n${facts}\n\nPAPER TEXT:\n\n${text}` },
          ],
          schema: NOTES_SCHEMA,
          maxTokens: 4096,
          temperature: 0.1,
        }),
      );

      // 4. Persist.
      await papers.setStage(paperId, "saving");
      await step.do("save-notes", () => papers.complete(paperId, notes).then(() => undefined));
    } catch (e) {
      await papers.fail(paperId, e instanceof Error ? e.message : String(e));
      throw e;
    }
  }
}
