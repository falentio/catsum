const xorshift = (n: number) => {
	n ^= n << 13;
	n ^= n >>> 17;
	n ^= n << 5;
	return n;
};
const u8 = 2 ** 8

export function createXorshift(seed: string) {
	let state = seed.length ** 2;
	for (const i of seed) {
		state += xorshift(state);
		state += xorshift(i.charCodeAt(0) ** 2);
	}
	return () => {
		state = xorshift(state);
		return ((state >>> 0) % u8) / u8;
	};
}
