import { csv } from "./deps.ts";

export interface Image {
	id: string;
	downloadUrl: string;
	shareUrl: string;
}

export class Images {
	list: Image[] = [];

	static async fromCsv(url: string): Promise<Images> {
		const images = new Images();
		const res = await fetch(url);
		const text = await res.text();
		if (!res.ok) {
			throw new Error(`failed to load ${url}`);
		}
		for (const [id, downloadUrl, shareUrl] of await csv.parse(text)) {
			images.insert({ id, downloadUrl, shareUrl });
		}
		return images;
	}

	insert(img: Image): this {
		this.list.push(img);
		return this;
	}

	get(id: string): Image | null {
		return this.list.find((i) => i.id === id) || null;
	}

	getRandom(randomFn: () => number = Math.random): Image {
		return this.list[randomFn() * this.list.length | 0] as Image;
	}
}
