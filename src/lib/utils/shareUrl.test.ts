import { afterEach, expect, it, vi } from "vitest";
import { localStorageKey } from "@/lib/paraglide/runtime";

vi.mock("@/lib/native/runtime", () => ({ getRootOrigin: () => "https://map.example" }));

afterEach(() => vi.unstubAllGlobals());

it.each([
	["es", ["de-DE"], "es", "/es/map"],
	[null, ["pl-PL"], "pl", "/pl/map"],
	[null, ["ja-JP"], "en", "/map"]
])(
	"keeps the UI preference independent of a German URL",
	async (saved, languages, locale, path) => {
		vi.resetModules();
		vi.stubGlobal("window", { location: new URL("https://map.example/de/map") });
		vi.stubGlobal("navigator", { languages });
		vi.stubGlobal("localStorage", {
			getItem: (key: string) => (key === localStorageKey ? saved : null),
			setItem: vi.fn()
		});
		const { getLocale } = await import("@/lib/paraglide/runtime");
		const { getShareUrl } = await import("./shareUrl");

		expect(getLocale()).toBe(locale);
		expect(getShareUrl("/de/map?lat=50&lon=8#point")).toBe(
			`https://map.example${path}?lat=50&lon=8#point`
		);
	}
);
