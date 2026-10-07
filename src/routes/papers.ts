import { Hono } from "hono";
import { MAX_UPLOAD_BYTES } from "../config";
import type { Env } from "../env";
import { PaperRepository } from "../repositories/papers";
import { chat } from "./chat";

export const papers = new Hono<{ Bindings: Env }>();

papers.get("/", async (c) => c.json(await new PaperRepository(c.env.DB).list()));

papers.post("/", async (c) => {
  const file = (await c.req.formData()).get("file");
  if (!(file instanceof File)) return c.json({ error: "file required" }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return c.json({ error: "PDF too large (15MB max)" }, 413);

  const id = crypto.randomUUID();
  await c.env.PDFS.put(`${id}.pdf`, await file.arrayBuffer());
  await new PaperRepository(c.env.DB).create(id, file.name);
  await c.env.PAPER_WORKFLOW.create({ id, params: { paperId: id } });
  return c.json({ id }, 202);
});

papers.get("/:id", async (c) => {
  const row = await new PaperRepository(c.env.DB).get(c.req.param("id"));
  if (!row) return c.json({ error: "not found" }, 404);
  const { text: _text, notes, ...paper } = row; // full text stays server-side
  return c.json({ ...paper, notes: notes ? JSON.parse(notes) : null });
});

papers.route("/:id/chat", chat);
