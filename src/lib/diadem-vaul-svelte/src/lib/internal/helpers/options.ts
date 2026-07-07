import type { Readable, Writable } from "svelte/store";

type StoresValues<S> = S extends Readable<infer _U>
	? _U
	: S extends Readable<infer _U>[]
		? { [K in keyof S]: S[K] extends Readable<infer _V> ? _V : never }
		: S extends Record<string, Readable<infer _V>>
			? { [K in keyof S]: S[K] extends Readable<infer _V2> ? _V2 : never }
			: never;

type Options = Record<string, Writable<unknown>>;

export function getOptionUpdater(options: Options) {
	return function <
		K extends keyof typeof options,
		V extends StoresValues<(typeof options)[keyof typeof options]>,
	>(key: K, value: V | undefined) {
		if (value === undefined) return;
		const store = options[key];
		if (store) {
			store.set(value as never);
		}
	};
}
