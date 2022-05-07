import type { RouterContext } from "./deps.ts";
import { autoBind, Context, ImgixClient } from "./deps.ts";
import { Images } from "./images.ts";
import { createXorshift } from "./xorshift.ts";

export class Handler {
	imgix!: ImgixClient;
	images!: Images;
	constructor() {
		autoBind(this);
	}

	async root(ctx: Context) {
		ctx.response.headers.set("cache-control", "public, max-age=7200");
		ctx.response.headers.set("content-type", "text/html");
		const res = await fetch(
			new URL("../public/index.html", import.meta.url).href,
		);
		ctx.response.body = res.body;
	}

	health(ctx: Context) {
		ctx.response.body = "ok";
	}

	list(ctx: Context) {
		const s = ctx.request.url.searchParams;
		const limit = +(s.get("limit") ?? 1000);
		const page = +(s.get("page") ?? 1);
		const offset = limit * (page - 1);
		const until = offset + limit;
		ctx.response.headers.set("cache-control", "public, max-age=86400");
		ctx.response.body = this.images.list
			.slice(offset, until);
	}

	serveImage(_ctx: Context) {
		const ctx = _ctx as RouterContext<"">;
		const params = {
			crop: "faces,entropy",
			fit: "crop",
		} as Record<string, string | number>;

		if (ctx.params.side) {
			params.w = params.h = +ctx.params.side;
		} else if (ctx.params.width && ctx.params.height) {
			params.w = +ctx.params.width;
			params.h = +ctx.params.height;
		}

		if (params.w > 4096) {
			ctx.response.status = 400;
			ctx.response.body = "width too long";
			return;
		}

		if (params.h > 2160) {
			ctx.response.status = 400;
			ctx.response.body = "height too height";
			return;
		}

		const q = ctx.request.url.searchParams;
		if (q.get("grayscale") !== null) {
			params.monochrome = "929292";
		}
		if (q.get("blur") !== null) {
			params.blur = Number(q.get("blur")!) * 10;
			if (params.blur > 2000) {
				ctx.response.status = 400;
				ctx.response.body = "blur params range is 0-20";
				return;
			}
		}
		switch (ctx.params.ext) {
			case "avif":
				params.fm = "avif";
				break;
			case "png":
				params.fm = "png";
				break;
			case "webp":
				params.fm = "webp";
				break;
			case "jpg":
			default:
				params.fm = "jpg";
				break;
		}

		if (ctx.params.seeds) {
			const h = ctx.request.headers;
			ctx.params.seed = "";
			for (const i of ctx.params.seeds.split(",")) {
				switch (i) {
					case "ip":
						ctx.params.seed += ctx.request.ip;
						break;
					case "referer":
					case "user-agent":
						ctx.params.seed += h.get(i) ?? "";
						break;
					case "day":
						ctx.params.seed += new Date().getDay().toString();
						break;
					case "date":
						ctx.params.seed += new Date().getDate().toString();
						break;
					case "month":
						ctx.params.seed += new Date().getMonth().toString();
						break;
					case "":
						break;
					default:
						ctx.response.status = 400;
						ctx.response.body = "invalid seed-with param: " + i;
						return;
				}
				ctx.params.seed += ";";
			}
		}

		const seed = ctx.params.seed;
		const randomFn = seed ? createXorshift(seed) : Math.random;

		const id = params._saestu_id = ctx.params.id ||
			this.images.getRandom(randomFn).id;
		const img = this.images.get(id);
		if (img === null) {
			ctx.response.status = 404;
			return;
		}

		const h = ctx.response.headers;
		h.set("cache-control", "private, no-store");
		h.set("share-url", img.shareUrl);
		if (seed || ctx.params.id) {
			h.set("cache-control", "public, max-age=86400");
		}
		if (ctx.params.seeds) {
			h.set("cache-control", "private, max-age=3600");
		}

		const url = this.imgix.buildURL(img.downloadUrl, params);
		ctx.response.redirect(url + "#" + img.id);
	}

	share(_ctx: Context) {
		const ctx = _ctx as RouterContext<"">;
		const id = ctx.params.id ?? "";
		const img = this.images.get(id);
		if (!img) {
			ctx.response.status = 404;
			return;
		}
		ctx.response.headers.set("cache-control", "public, max-age=7200");
		ctx.response.redirect(img.shareUrl);
	}

	original(_ctx: Context) {
		const ctx = _ctx as RouterContext<"">;
		const id = ctx.params.id ?? "";
		const img = this.images.get(id);
		if (!img) {
			ctx.response.status = 404;
			return;
		}
		ctx.response.headers.set("cache-control", "public, max-age=7200");
		ctx.response.redirect(img.downloadUrl);
	}

	info(_ctx: Context) {
		const ctx = _ctx as RouterContext<"">;
		const id = ctx.params.id ?? "";
		const img = this.images.get(id);
		if (!img) {
			ctx.response.status = 404;
			return;
		}
		ctx.response.headers.set("cache-control", "public, max-age=7200");
		ctx.response.body = img;
	}
}
