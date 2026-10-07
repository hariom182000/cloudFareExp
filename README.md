# PaperPulse

AI research-paper note-taker on Cloudflare.

https://paperpulse.hariworksfor.workers.dev/

Upload PDF → Worker → **Workflow** (parse with `unpdf` → extract verbatim facts → Llama 3.3 structured notes → save) → **D1** library + persistent chat.

| Layer | Service |
|---|---|
| UI | Workers static assets (`public/`) |
| API | Worker (`src/index.ts`) |
| Coordination | Workflows (`src/workflow.ts`) |
| LLM | Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| State | D1 (notes, chat), R2 (PDF blobs) |

## Setup
```
npm install
npx wrangler login
npx wrangler d1 create paperpulse        # paste database_id into wrangler.jsonc
npx wrangler r2 bucket create paperpulse-pdfs
npm run db:remote
npm run deploy
```
Local: `npm run db:local && npm run dev`.
