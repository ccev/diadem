import { baseLocale, isLocale } from "./locales";

export { locales } from "./locales";

// Match Wuchale's loader selection for shared number/date/game-text helpers.
// Vite removes the unused branch, so AsyncLocalStorage stays on the server.
const { getRuntime } = import.meta.env.SSR
	? await import("../../locales/main.loader.server.svelte.js")
	: await import("../../locales/main.loader.svelte.js");

export function getLocale() {
	const locale = getRuntime().l;
	return isLocale(locale) ? locale : baseLocale;
}
