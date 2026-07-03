import { isAllowedTwoSidebars } from "$lib/utils/device";
import { setCurrentSelectedData } from "$lib/mapObjects/currentSelectedState.svelte";

export enum Menu {
	PROFILE = "profile",
	FILTERS = "filters",
	SCOUT = "scout",
	TOOLS = "tools",
	COVERAGE_MAP = "coveragemap"
}

let openedMenu: Menu | null = $state(null);

// set this when switching from tool menu to tool,
let justChangedMenus: boolean = $state(false);

export function openMenu(type: Menu) {
	openedMenu = type;
	if (!isAllowedTwoSidebars()) {
		setCurrentSelectedData(null)
	}
}

export function closeMenu() {
	openedMenu = null;
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
