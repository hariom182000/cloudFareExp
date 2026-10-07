export const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

/** Llama 3.3 on Workers AI has a ~24k token window; ~4 chars/token, leave room for output. */
export const MAX_PAPER_CHARS = 60_000;
/** Budget for paper text inside a chat prompt (notes + history take the rest). */
export const CHAT_PAPER_CHARS = 40_000;
export const CHAT_HISTORY_LIMIT = 10;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
