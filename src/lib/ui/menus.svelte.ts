import { isAllowedTwoSidebars } from "$lib/utils/device";
import { setCurrentSelectedData } from "$lib/mapObjects/currentSelectedState.svelte";
import { getConfig } from "$lib/services/config/config";
import { getMapPath } from "$lib/utils/getMapPath";
import {
	closeOverlay,
	isReconcilingOverlays,
	registerOverlayHandler,
	replaceOverlay
} from "$lib/ui/overlays.svelte";

export enum Menu {
	PROFILE = "profile",
	FILTERS = "filters",
	SCOUT = "scout",
	TOOLS = "tools",
	COVERAGE_MAP = "coveragemap"
}

let openedMenu: Menu | null = $state(null);
let persistentMenu: Menu | null = null;

// set this when switching from tool menu to tool,
let justChangedMenus: boolean = $state(false);

registerOverlayHandler("menu", (entries) => {
	const entry = entries.at(-1);
	openedMenu = entry ? (entry.id as Menu) : persistentMenu;
});

export function openMenu(type: Menu, history = true) {
	persistentMenu = history ? null : type;
	openedMenu = type;
	if (!isAllowedTwoSidebars()) {
		setCurrentSelectedData(null);
	}
	if (history && !isReconcilingOverlays()) {
		const replaceKinds = isAllowedTwoSidebars() ? undefined : (["menu", "map-popup"] as const);
		replaceOverlay(
			{ kind: "menu", id: type },
			replaceKinds ? getMapPath(getConfig()) : "",
			replaceKinds ? [...replaceKinds] : undefined
		);
	}
}

export function closeMenu({ history = true }: { history?: boolean } = {}) {
	if (!history) persistentMenu = null;
	openedMenu = null;
	if (history && !isReconcilingOverlays()) closeOverlay({ kind: "menu", id: "" });
}

export function getOpenedMenu() {
	return openedMenu;
}

export function setJustChangedMenus() {
	justChangedMenus = true;
}

export function resetJustChangedMenus() {
	justChangedMenus = false;
}

export function onMenuDrawerOpenChangeComplete(open: boolean) {
	if (open) return;
	if (justChangedMenus) {
		resetJustChangedMenus();
		return;
	}

	closeMenu();
}
