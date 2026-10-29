import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { Copy, Link } from "@lucide/svelte";
import type { MapMouseEvent, MapTouchEvent } from "maplibre-gl";
import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
import type { QuickAction } from "@/lib/ui/quickActions.svelte";

const state = vi.hoisted(() => ({
	hit: vi.fn(),
	open: vi.fn(),
	location: vi.fn(),
	scout: vi.fn(),
	menu: null as string | null,
	actions: vi.fn(() => [] as QuickAction[]),
	popupProps: vi.fn(() => ({ title: "Popup marker title" })),
	path: vi.fn(({ data }: { data: { type: string; id: string } }) => `/${data.type}/${data.id}`),
	canShare: vi.fn(() => false),
	clipboard: vi.fn(() => true),
	copy: vi.fn(),
	share: vi.fn(),
	origin: "https://map.example",
	locale: "en"
}));
vi.mock("@/lib/mapObjects/interact", () => ({
	openLocationPopup: state.location,
	getCurrentPath: state.path
}));
vi.mock("@/lib/map/mapObjectsAtPoint", () => ({ getMapObjectAtPoint: state.hit }));
vi.mock("@/lib/features/scout.svelte", () => ({ setCurrentScoutCenter: state.scout }));
vi.mock("@/lib/ui/menus.svelte", () => ({
	getOpenedMenu: () => state.menu,
	Menu: { SCOUT: "scout" }
}));
vi.mock("@/lib/ui/quickActions.svelte", () => ({ openQuickActions: state.open }));
vi.mock("@/lib/ui/primaryPopupActions", () => ({ getPrimaryPopupActions: state.actions }));
vi.mock("@/lib/ui/popupProps", () => ({ getPopupProps: state.popupProps }));
vi.mock("@/lib/features/location.svelte", () => ({
	formattedCoordinates: (coords: { lat: number; lon: number }) =>
		`${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`
}));
vi.mock("@/lib/utils/device", () => ({
	canNativeShare: state.canShare,
	hasClipboardWrite: state.clipboard,
	copyToClipboard: state.copy,
	backupShareUrl: state.share
}));
vi.mock("@/lib/native/runtime", () => ({ getRootOrigin: () => state.origin }));
vi.mock("@/lib/paraglide/runtime", () => ({ getLocale: () => state.locale }));
vi.mock("@/lib/paraglide/messages", () => ({
	m: {
		popup_share: () => "Share",
		copy_link: () => "Copy link",
		context_menu_copy_coordinates: () => "Copy coordinates"
	}
}));
vi.mock("@lucide/svelte", () => ({ Copy: vi.fn(), Link: vi.fn(), Share2: vi.fn() }));
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
	state.canShare.mockReturnValue(false);
	state.clipboard.mockReturnValue(true);
	state.actions.mockImplementation(() => [{ label: "Navigate", Icon: vi.fn(() => ({})) }]);
	state.origin = "https://map.example";
	state.locale = "en";
});
afterEach(() => {
	resetMapPress();
	vi.useRealTimers();
});
describe("map context actions", () => {
	it("uses the hit marker's actions without opening its full popup", () => {
		const marker = { id: "target", type: MapObjectType.POKEMON, lat: 12.3456789, lon: 98.7654321 };
		state.hit.mockReturnValue(marker);
		onLocationContext(event("contextmenu"));
		expect(state.location).not.toHaveBeenCalled();
		const menu = state.open.mock.calls[0][0];
		expect(menu).toMatchObject({ x: 30, y: 45, title: "Popup marker title" });
		expect(state.popupProps).toHaveBeenCalledExactlyOnceWith(marker);
		expect(state.hit).toHaveBeenCalledExactlyOnceWith({ x: 20, y: 30 }, { quickActions: true });
		menu.getActions();
		expect(state.actions).toHaveBeenCalledWith(marker, marker.lat, marker.lon);
	});
	it("appends Copy link and Copy coordinates after the primary actions", () => {
		const marker = { id: "target", type: MapObjectType.POKEMON, lat: 12, lon: 98 };
		state.hit.mockReturnValue(marker);
		onLocationContext(event("contextmenu"));
		const actions: QuickAction[] = state.open.mock.calls[0][0].getActions();
		expect(actions.map((action) => action.label)).toEqual([
			"Navigate",
			"Copy link",
			"Copy coordinates"
		]);
		expect(actions.at(-2)?.Icon).toBe(Link);
		expect(actions.at(-1)?.Icon).toBe(Copy);
		actions.at(-2)?.onclick?.();
		expect(state.path).toHaveBeenCalledExactlyOnceWith({ data: marker });
		expect(state.copy).toHaveBeenCalledExactlyOnceWith(
			"https://map.example/pokemon/target?lang=en"
		);
		expect(state.share).not.toHaveBeenCalled();
	});
	it("prefers native sharing and keeps Copy coordinates last", () => {
		state.hit.mockReturnValue({ id: "target", type: MapObjectType.GYM, lat: 12, lon: 98 });
		state.canShare.mockReturnValue(true);
		onLocationContext(event("contextmenu"));
		const actions: QuickAction[] = state.open.mock.calls[0][0].getActions();
		expect(actions.map((action) => action.label)).toEqual([
			"Navigate",
			"Share",
			"Copy coordinates"
		]);
		expect(actions.at(-1)?.Icon).toBe(Copy);
		expect(state.canShare).toHaveBeenCalledWith({ url: "https://map.example/gym/target?lang=en" });
		actions.at(-2)?.onclick?.();
		expect(state.share).toHaveBeenCalledExactlyOnceWith("https://map.example/gym/target?lang=en");
		expect(state.copy).not.toHaveBeenCalled();
	});
	it.each([
		MapObjectType.POKEMON,
		MapObjectType.GYM,
		MapObjectType.POKESTOP,
		MapObjectType.STATION,
		MapObjectType.NEST,
		MapObjectType.SPAWNPOINT,
		MapObjectType.TAPPABLE,
		MapObjectType.ROUTE
	])("copies and navigates to the object's location for %s", (type) => {
		const marker = { id: "target", type, lat: 12.3456789, lon: 98.7654321 };
		state.hit.mockReturnValue(marker);
		onLocationContext(event("contextmenu"));
		const actions: QuickAction[] = state.open.mock.calls[0][0].getActions();
		expect(state.actions).toHaveBeenCalledExactlyOnceWith(marker, marker.lat, marker.lon);
		actions.at(-1)?.onclick?.();
		expect(state.copy).toHaveBeenCalledExactlyOnceWith("12.345679, 98.765432");
	});
	it("shares the nest marker using its permalink, instance origin and locale", () => {
		const nest = { id: "target", type: MapObjectType.NEST, lat: 12, lon: 98 };
		state.hit.mockReturnValue(nest);
		state.origin = "https://native-map.example";
		state.locale = "de";
		onLocationContext(event("contextmenu"));
		const actions: QuickAction[] = state.open.mock.calls[0][0].getActions();
		actions.at(-2)?.onclick?.();
		expect(state.path).toHaveBeenCalledExactlyOnceWith({ data: nest });
		expect(state.copy).toHaveBeenCalledExactlyOnceWith(
			"https://native-map.example/nest/target?lang=de"
		);
	});
	it("does not offer unsupported clipboard actions", () => {
		state.hit.mockReturnValue({ id: "target", type: MapObjectType.GYM, lat: 12, lon: 98 });
		state.clipboard.mockReturnValue(false);
		onLocationContext(event("contextmenu"));
		const menu = state.open.mock.calls[0][0];
		expect(menu.getActions().map((action: QuickAction) => action.label)).toEqual(["Navigate"]);
		state.canShare.mockReturnValue(true);
		expect(menu.getActions().map((action: QuickAction) => action.label)).toEqual([
			"Navigate",
			"Share"
		]);
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
