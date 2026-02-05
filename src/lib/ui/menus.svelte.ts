export enum Menu {
	PROFILE = "profile",
	FILTERS = "filters",
	SCOUT = "scout"
}

let openedMenu: Menu | null = $state(null)

export function openMenu(type: Menu) {
	openedMenu = type
}

export function closeMenu() {
	openedMenu = null
}

export function getOpenedMenu() {
	return openedMenu;
}

