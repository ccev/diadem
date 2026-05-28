import { browser } from "$app/environment";
import { on } from "svelte/events";

export function onShortcutSearch(callback: () => void) {
	if (!browser) return () => {};

	return on(window, "keydown", (event) => {
		if (event.key.toLowerCase() !== "k") return;
		if (!event.metaKey && !event.ctrlKey) return;

		event.preventDefault();
		callback();
	});
}
