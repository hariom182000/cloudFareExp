import { Hono } from "hono";
import type { Env } from "./env";
import { papers } from "./routes/papers";

const app = new Hono<{ Bindings: Env }>();

app.route("/api/papers", papers);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});
app.notFound((c) => c.json({ error: "not found" }, 404));

export default app;
export { PaperWorkflow } from "./workflow";
