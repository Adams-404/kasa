/**
 * The deployed route. Vercel's Node runtime calls a default export with
 * `(req, res)`, which is exactly the signature `handleChat` has, so the same
 * handler runs in `vite dev` and in production instead of two implementations.
 */
import { handleChat } from "../server/chat.js";

export default handleChat;
