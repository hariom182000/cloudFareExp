import type { ChatMessage } from "../types";

export class ChatRepository {
  constructor(private db: D1Database) {}

  async all(paperId: string): Promise<ChatMessage[]> {
    const { results } = await this.db
      .prepare("SELECT role, content FROM chat_messages WHERE paper_id = ? ORDER BY id")
      .bind(paperId)
      .all<ChatMessage>();
    return results;
  }

  async recent(paperId: string, limit: number): Promise<ChatMessage[]> {
    const { results } = await this.db
      .prepare(
        "SELECT role, content FROM (SELECT id, role, content FROM chat_messages WHERE paper_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id",
      )
      .bind(paperId, limit)
      .all<ChatMessage>();
    return results;
  }

  async appendExchange(paperId: string, question: string, answer: string) {
    const now = Date.now();
    const insert = "INSERT INTO chat_messages (paper_id, role, content, created_at) VALUES (?, ?, ?, ?)";
    await this.db.batch([
      this.db.prepare(insert).bind(paperId, "user", question, now),
      this.db.prepare(insert).bind(paperId, "assistant", answer, now + 1),
    ]);
  }
}
