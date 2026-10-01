export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** Erro com mensagem pronta para o usuário (vai para o toast). */
export class UserError extends Error {}
