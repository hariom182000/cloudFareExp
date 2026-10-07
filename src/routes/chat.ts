import { Hono } from "hono";
import type { Env } from "../env";
import { ChatRepository } from "../repositories/chat";
import { PaperRepository } from "../repositories/papers";
import { answerQuestion } from "../services/chat";

export const chat = new Hono<{ Bindings: Env }>();

chat.get("/", async (c) => c.json(await new ChatRepository(c.env.DB).all(c.req.param("id")!)));

chat.post("/", async (c) => {
  const { message, section } = await c.req.json<{ message?: string; section?: string }>();
  if (!message?.trim()) return c.json({ error: "message required" }, 400);

  const paper = await new PaperRepository(c.env.DB).get(c.req.param("id")!);
  if (!paper) return c.json({ error: "not found" }, 404);
  if (paper.status !== "done") return c.json({ error: "paper not ready" }, 409);

  return c.json({ answer: await answerQuestion(c.env, paper, message, section) });
});
