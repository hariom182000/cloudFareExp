import { MODEL } from "../config";

type Message = { role: "system" | "user" | "assistant"; content: string };
interface Options {
  messages: Message[];
  maxTokens: number;
  temperature: number;
}

// Workers AI's generated types don't cover json_schema response_format yet.
const run = (env: { AI: Ai }, body: object) => (env.AI as any).run(MODEL, body) as Promise<{ response?: unknown }>;

export async function generateText(env: { AI: Ai }, o: Options): Promise<string> {
  const res = await run(env, { messages: o.messages, max_tokens: o.maxTokens, temperature: o.temperature });
  return String(res.response ?? "");
}

/** Schema-constrained generation. Returns the parsed object. */
export async function generateJson<T>(env: { AI: Ai }, o: Options & { schema: object }): Promise<T> {
  const res = await run(env, {
    messages: o.messages,
    response_format: { type: "json_schema", json_schema: o.schema },
    max_tokens: o.maxTokens,
    temperature: o.temperature,
  });
  return (typeof res.response === "string" ? JSON.parse(res.response) : res.response) as T;
}
