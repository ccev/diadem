import { pushState, replaceState } from "$app/navigation";
import { page } from "$app/state";

export type OverlayKind =
	| "menu"
	| "modal"
	| "map-popup"
	| "context-menu"
	| "popup-actions"
	| "coverage-popup"
	| "wayfarer-popup"
	| "active-search";

export type OverlayEntry = {
	kind: OverlayKind;
	id: string;
	payloadKey?: string;
};

export type OverlayInput = Omit<OverlayEntry, "payloadKey"> & { data?: unknown };

type OverlayHandler = (entries: OverlayEntry[]) => void;

const handlers = new Map<OverlayKind, Set<OverlayHandler>>();
const payloads = new Map<string, unknown>();
let activeOverlays: OverlayEntry[] = $state([]);
let syncing = false;
let payloadId = 0;

function getOverlays(state: App.PageState = page.state): OverlayEntry[] {
	return state.overlays ?? [];
}

function getState(overlays: OverlayEntry[]): App.PageState {
	return { ...page.state, overlays };
}

function isSameOverlay(left: OverlayEntry, right: OverlayEntry) {
	return left.kind === right.kind && left.id === right.id;
}

function createEntry(entry: OverlayInput): OverlayEntry {
	if (entry.data === undefined) return { kind: entry.kind, id: entry.id };

	const payloadKey = `${entry.kind}:${entry.id}:${++payloadId}`;
	payloads.set(payloadKey, entry.data);
	return { kind: entry.kind, id: entry.id, payloadKey };
}

export function getOverlayPayload<T>(entry: OverlayEntry | undefined): T | undefined {
	return entry?.payloadKey ? (payloads.get(entry.payloadKey) as T | undefined) : undefined;
}

export function registerOverlayHandler(kind: OverlayKind, handler: OverlayHandler) {
	const kindHandlers = handlers.get(kind) ?? new Set<OverlayHandler>();
	kindHandlers.add(handler);
	handlers.set(kind, kindHandlers);
	handler(activeOverlays.filter((entry) => entry.kind === kind));

	return () => {
		kindHandlers.delete(handler);
		if (kindHandlers.size === 0) handlers.delete(kind);
	};
}

export function reconcileOverlays(state: App.PageState) {
	activeOverlays = getOverlays(state);
	syncing = true;
	try {
		for (const [kind, kindHandlers] of handlers) {
			const entries = activeOverlays.filter((entry) => entry.kind === kind);
			for (const handler of kindHandlers) handler(entries);
		}
	} finally {
		syncing = false;
	}
}

export function isReconcilingOverlays() {
	return syncing;
}

export function openOverlay(input: OverlayInput, url: string | URL = "") {
	const entry = createEntry(input);
	const overlays = getOverlays();
	const index = overlays.findIndex((overlay) => isSameOverlay(overlay, entry));

	if (index !== -1) {
		const next = [...overlays];
		next[index] = entry;
		replaceState(url, getState(next));
		return;
	}

	pushState(url, getState([...overlays, entry]));
}

export function replaceOverlay(
	input: OverlayInput,
	url: string | URL = "",
	replaceKinds: OverlayKind[] = [input.kind]
) {
	const entry = createEntry(input);
	const current = getOverlays();
	const overlays = current.filter((overlay) => !replaceKinds.includes(overlay.kind));
	const next = [...overlays, entry];
	if (overlays.length === current.length) pushState(url, getState(next));
	else replaceState(url, getState(next));
}

export function closeOverlay(entry: Pick<OverlayEntry, "kind" | "id">, url: string | URL = "") {
	const overlays = getOverlays();
	const index = overlays.findLastIndex(
		(overlay) => overlay.kind === entry.kind && (!entry.id || overlay.id === entry.id)
	);
	if (index === -1) return false;

	if (index === overlays.length - 1) {
		history.back();
	} else {
		replaceState(url, getState(overlays.filter((_, overlayIndex) => overlayIndex !== index)));
	}

	return true;
}

export function closeTopOverlay() {
	const overlay = getOverlays().at(-1);
	if (!overlay) return false;
	history.back();
	return true;
}

export function replacePageState(url: string | URL) {
	replaceState(url, getState(getOverlays()));
}

export function clearOverlays() {
	replaceState("", getState([]));
}
