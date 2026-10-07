import { CHAT_HISTORY_LIMIT, CHAT_PAPER_CHARS } from "../config";
import type { Env } from "../env";
import { CHAT_SYSTEM_PROMPT } from "../prompts";
import { ChatRepository } from "../repositories/chat";
import { SECTION_LABELS, type Notes, type PaperRow, type SectionKey } from "../types";
import { generateText } from "./llm";

const isSection = (s: unknown): s is SectionKey => typeof s === "string" && s in SECTION_LABELS;

function buildContext(paper: PaperRow, section?: string): string {
  const notes = JSON.parse(paper.notes!) as Notes;
  const focus = isSection(section)
    ? `\n\nThe user is asking about this section of the notes: ${SECTION_LABELS[section]}\n${JSON.stringify(notes[section])}`
    : "";
  return `STRUCTURED NOTES:\n${JSON.stringify(notes)}${focus}\n\nPAPER TEXT (may be truncated):\n${(paper.text ?? "").slice(0, CHAT_PAPER_CHARS)}`;
}

export async function answerQuestion(env: Env, paper: PaperRow, message: string, section?: string) {
  const chats = new ChatRepository(env.DB);
  const history = await chats.recent(paper.id, CHAT_HISTORY_LIMIT);

  const answer = await generateText(env, {
    messages: [
      { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\n${buildContext(paper, section)}` },
      ...history,
      { role: "user", content: message },
    ],
    maxTokens: 800,
    temperature: 0.3,
  });

  await chats.appendExchange(paper.id, message, answer);
  return answer;
}
