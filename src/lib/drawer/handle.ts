import type { DrawerState } from "./context.svelte.js";

export interface DrawerHandle<Payload = unknown> {
	state?: DrawerState;
	payload?: Payload;
}

export function createHandle<Payload = unknown>(): DrawerHandle<Payload> {
	return {};
}
