const xorshift = (n: number) => {
	n ^= n << 13;
	n ^= n >>> 17;
	n ^= n << 5;
	return n;
};

const MAX = -1 >>> 0;

export function createXorshift(seed: string) {
	let state = seed.length ** 2;
	for (const i of seed) {
		state += xorshift(state);
		state += xorshift(i.charCodeAt(0));
	}
	return () => {
		state = xorshift(state);
		return (state >>> 0) / MAX;
	};
}
