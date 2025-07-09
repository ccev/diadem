import { innerWidth } from "svelte/reactivity/window";
import { getUserSettings } from "@/lib/userSettings.svelte";

export type MenuTypes = null | "profile" | "filters"

let openedMenu: MenuTypes = $state(null)

export function openMenu(type: MenuTypes) {
	openedMenu = type
}

export function getOpenedMenu() {
	return openedMenu;
}

export function isMenuSidebar() {
	return (innerWidth.current ?? 0) > 580
}

export function isUiLeft() {
	return isMenuSidebar() || getUserSettings().isLeftHanded
}