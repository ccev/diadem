import { mode, resetMode, setMode, toggleMode } from "mode-watcher";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import { getConfig } from "@/lib/services/config/config";
import type { MapStyle } from "@/lib/services/config/configTypes";

export function toggleThemeMode() {
	toggleMode();
	updateDefaultMapStyle()
	getUserSettings().themeMode = mode?.current ?? "system";
	updateUserSettings();
}

export function setThemeMode(newMode: "dark" | "light" | "system") {
	setMode(newMode);
	updateDefaultMapStyle()
	getUserSettings().themeMode = newMode;
	updateUserSettings();
}

export function updateDefaultMapStyle() {
	const mapStyle = getDefaultMapStyle()
	getUserSettings().mapStyle.id = mapStyle.id
	getUserSettings().mapStyle.url = mapStyle.url
}

export function getDefaultMapStyle() {
	return getConfig().mapStyles.find((s) => s.default === mode.current) ?? getConfig().mapStyles[0];
}

export function isDarkMode() {
	return mode?.current === "dark";
}
