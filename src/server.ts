import { Application, ImgixClient, Router } from "./deps.ts";
import { Handler } from "./handler.ts";
import { Images } from "./images.ts";
import { autoBody, cors, createLimiter } from "./middlewares.ts";

function getEnv<T>(name: string, def: string, cb: (s: string) => T): T {
	return cb(Deno.env.get(name) || def);
}

const port = getEnv("PORT", "8080", Number);
const hourlyLimit = getEnv("HOURLY_LIMIT", "120", Number);
const imagesUrl = getEnv(
	"IMAGES_URL",
	new URL("../albums/cats.csv", import.meta.url).toString(),
	String,
);
const imgixDomain = getEnv("IMGIX_DOMAIN", "", String);
const imgixSecret = getEnv("IMGIX_SECRET", "", String);

const h = new Handler();
h.imgix = new ImgixClient({
	domain: imgixDomain,
	secureURLToken: imgixSecret,
});
h.images = await Images.fromCsv(
	imagesUrl,
);

const r = new Router();
r.get("/", h.root);
r.get("/health", h.health);
r.get("/share/:id", h.share);
r.get("/id/:id", h.original);
r.get("/id/:id/:any(.*)", h.original);
r.get("/id/:id/:side(\\d+).:ext?", h.serveImage);
r.get("/id/:id/:width(\\d+)/:height(\\d+).:ext?", h.serveImage);
r.get("/seed/:seed/:side(\\d+).:ext?", h.serveImage);
r.get("/seed/:seed/:width(\\d+)/:height(\\d+).:ext?", h.serveImage);
r.get("/:side(\\d+).:ext?", h.serveImage);
r.get("/:width(\\d+)/:height(\\d+).:ext?", h.serveImage);

export const app = new Application({ proxy: true });
app.use(cors);
app.use(autoBody);
app.use(createLimiter(hourlyLimit, 1000 * 60 * 60));
app.use(r.allowedMethods());
app.use(r.routes());
if (import.meta.main) {
	app.addEventListener(
		"listen",
		() => console.log("listening on port:", port),
	);
	app.listen({ port });
}
