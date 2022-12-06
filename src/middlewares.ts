import { Context, STATUS_TEXT } from "./deps.ts";

export function createLimiter(
	limit: number,
	resetInterval: number,
) {
	const pool = {} as {
		[k: string]: {
			[k: string]: number;
		};
	};
	return async (ctx: Context, next: () => Promise<unknown>) => {
		const ip = ctx.request.ip;
		pool[ip] ??= {};
		pool[ip].last ??= Date.now();
		pool[ip].limit ??= limit;
		const reset = pool[ip].last + resetInterval;
		if (reset < Date.now()) {
			pool[ip].last = Date.now();
			pool[ip].limit = limit;
		}

		if (--pool[ip].limit < 0) {
			ctx.response.status = 429;
			return;
		}

		await next();
	};
}

export async function cors(ctx: Context, next: () => Promise<unknown>) {
	await next();
	const h = ctx.response.headers;
	h.set("Access-Control-Allow-Origin", "*");
	h.set("Access-Control-Max-Age", "86400");
	h.set("Access-Control-Allow-Methods", "GET");
	h.set("Kangen", 54272778..toString(22));
	if (ctx.request.method === "OPTIONS") {
		ctx.response.status = 204;
		return;
	}
}

export function autoBody(ctx: Context, next: () => Promise<unknown>) {
	return next().then((_) => {
		ctx.response.body ||= STATUS_TEXT[ctx.response.status];
	}) as Promise<void>;
}
