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

const handler = new Handler();
handler.imgix = new ImgixClient({
	domain: imgixDomain,
	secureURLToken: imgixSecret,
});
handler.images = await Images.fromCsv(
	imagesUrl,
);

const router = new Router(); // deno-lint-ignore no-explicit-any
router.get("/", handler.root as any); // deno-lint-ignore no-explicit-any
router.get("/health", handler.health as any); // deno-lint-ignore no-explicit-any
router.get("/share/:id", handler.share as any); // deno-lint-ignore no-explicit-any
router.get("/id/:id", handler.original as any); // deno-lint-ignore no-explicit-any
router.get("/id/:id/:any(.*)", handler.original as any); // deno-lint-ignore no-explicit-any
router.get("/id/:id/:side(\\d+).:ext?", handler.serveImage as any); // deno-lint-ignore no-explicit-any
router.get("/id/:id/:width(\\d+)/:height(\\d+).:ext?", handler.serveImage as any); // deno-lint-ignore no-explicit-any
router.get("/seed/:seed/:side(\\d+).:ext?", handler.serveImage as any); // deno-lint-ignore no-explicit-any
router.get("/seed/:seed/:width(\\d+)/:height(\\d+).:ext?", handler.serveImage as any); // deno-lint-ignore no-explicit-any
router.get("/:side(\\d+).:ext?", handler.serveImage as any); // deno-lint-ignore no-explicit-any
router.get("/:width(\\d+)/:height(\\d+).:ext?", handler.serveImage as any);

export const app = new Application({ proxy: true });
app.use(cors);
app.use(autoBody);
app.use(createLimiter(hourlyLimit, 1000 * 60 * 60));
app.use(router.allowedMethods());
app.use(router.routes());
if (import.meta.main) {
	app.addEventListener("listen", () => console.log("listening on port:", port));
	app.listen({ port });
}
