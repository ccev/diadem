import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { MapMouseEvent, MapTouchEvent } from "maplibre-gl";
const state = vi.hoisted(() => ({
	hit: vi.fn(),
	open: vi.fn(),
	location: vi.fn(),
	scout: vi.fn(),
	menu: null as string | null,
	actions: vi.fn(() => [])
}));
vi.mock("@/lib/mapObjects/interact", () => ({ openLocationPopup: state.location }));
vi.mock("@/lib/map/hitTest", () => ({ getMapObjectAtPoint: state.hit }));
vi.mock("@/lib/features/scout.svelte", () => ({ setCurrentScoutCenter: state.scout }));
vi.mock("@/lib/ui/menus.svelte", () => ({
	getOpenedMenu: () => state.menu,
	Menu: { SCOUT: "scout" }
}));
vi.mock("@/lib/ui/quickActions.svelte", () => ({ openQuickActions: state.open }));
vi.mock("@/lib/ui/primaryPopupActions", () => ({ getPrimaryPopupActions: state.actions }));
vi.mock("@/lib/features/shareTexts", () => ({ getShareTitle: () => "Marker" }));
import {
	onLocationContext,
	onMapTouchEnd,
	resetMapPress,
	shouldSuppressMapClick
} from "./locationEvents";

function event(type: string, pointerType?: string) {
	return {
		type,
		point: { x: 20, y: 30 },
		lngLat: { lat: 50, lng: 8 },
		preventDefault: vi.fn(),
		originalEvent: { preventDefault: vi.fn(), pointerType },
		target: { getCanvas: () => ({ getBoundingClientRect: () => ({ left: 10, top: 15 }) }) }
	} as unknown as MapMouseEvent & MapTouchEvent;
}
beforeEach(() => {
	vi.useFakeTimers();
	vi.clearAllMocks();
	resetMapPress();
	state.menu = null;
	state.hit.mockReturnValue(undefined);
});
afterEach(() => {
	resetMapPress();
	vi.useRealTimers();
});
describe("map context actions", () => {
	it("uses the hit marker's actions without opening its full popup", () => {
		const marker = { id: "target" };
		state.hit.mockReturnValue(marker);
		onLocationContext(event("contextmenu"));
		expect(state.location).not.toHaveBeenCalled();
		const menu = state.open.mock.calls[0][0];
		expect(menu).toMatchObject({ x: 30, y: 45, title: "Marker" });
		menu.getActions();
		expect(state.actions).toHaveBeenCalledWith(marker);
	});
	it("preserves empty-space location actions and scout placement", () => {
		onLocationContext(event("contextmenu"));
		expect(state.location).toHaveBeenCalledWith(expect.objectContaining({ lat: 50, lon: 8 }));
		state.menu = "scout";
		onLocationContext(event("contextmenu"));
		expect(state.scout).toHaveBeenCalledTimes(1);
		expect(state.open).not.toHaveBeenCalled();
	});
	it.each(["touchstart", "contextmenu"])(
		"suppresses release clicks even after a long %s hold",
		(type) => {
			onLocationContext(event(type, "touch"));
			vi.advanceTimersByTime(5000);
			expect(shouldSuppressMapClick()).toBe(true);
			onLocationContext(event("contextmenu", "touch"));
			expect(state.location).toHaveBeenCalledTimes(1);
			onMapTouchEnd();
			expect(shouldSuppressMapClick()).toBe(true);
			resetMapPress();
			expect(shouldSuppressMapClick()).toBe(false);
		}
	);
});
