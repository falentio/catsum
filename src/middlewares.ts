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
	return (ctx: Context, next: () => Promise<void>) => {
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

		return next();
	};
}

export function cors(ctx: Context, next: () => Promise<void>) {
	const h = ctx.response.headers;
	h.set("Access-Control-Allow-Origin", "*");
	h.set("Access-Control-Max-Age", "86400");
	h.set("Access-Control-Allow-Methods", "GET");
	if (ctx.request.method === "OPTIONS") {
		ctx.response.status = 204;
		return;
	}
	return next();
}

export function autoBody(ctx, next) {
	return next().then((_) => {
		ctx.response.body ||= STATUS_TEXT.get(ctx.response.status);
	});
}
