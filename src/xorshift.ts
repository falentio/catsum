const xorshift = (n: number) => {
	n ^= n << 13;
	n ^= n >>> 17;
	n ^= n << 5;
	return n;
};

const MAX = -1 >>> 0;

export function createXorshift(seed: string) {
	let state = seed.length;
	for (const i of seed) {
		state ^= i.charCodeAt(0);
		state = xorshift(state);
	}
	return () => {
		const i = state = xorshift(state) >>> 0;
		return i / MAX;
	};
}
