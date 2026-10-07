import type { Notes, PaperRow, Stage } from "../types";

export type PaperSummary = Pick<PaperRow, "id" | "filename" | "title" | "status" | "created_at"> & {
  one_liner: string | null;
};

export class PaperRepository {
  constructor(private db: D1Database) {}

  async create(id: string, filename: string) {
    await this.db
      .prepare("INSERT INTO papers (id, filename, status, created_at) VALUES (?, ?, 'processing', ?)")
      .bind(id, filename, Date.now())
      .run();
  }

  async list(): Promise<PaperSummary[]> {
    const { results } = await this.db
      .prepare("SELECT id, filename, title, status, notes, created_at FROM papers ORDER BY created_at DESC")
      .all<PaperRow>();
    return results.map(({ notes, ...p }) => ({
      id: p.id,
      filename: p.filename,
      title: p.title,
      status: p.status,
      created_at: p.created_at,
      one_liner: notes ? (JSON.parse(notes) as Notes).one_liner : null,
    }));
  }

  async get(id: string): Promise<PaperRow | null> {
    return this.db.prepare("SELECT * FROM papers WHERE id = ?").bind(id).first<PaperRow>();
  }

  setStage(id: string, stage: Stage) {
    return this.db.prepare("UPDATE papers SET stage = ? WHERE id = ?").bind(stage, id).run();
  }

  setText(id: string, text: string) {
    return this.db.prepare("UPDATE papers SET text = ? WHERE id = ?").bind(text, id).run();
  }

  complete(id: string, notes: Notes) {
    return this.db
      .prepare("UPDATE papers SET notes = ?, title = ?, status = 'done' WHERE id = ?")
      .bind(JSON.stringify(notes), notes.title ?? null, id)
      .run();
  }

  fail(id: string, error: string) {
    return this.db
      .prepare("UPDATE papers SET status = 'error', error = ? WHERE id = ?")
      .bind(error, id)
      .run();
  }
}
