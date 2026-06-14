import { getConfig } from "@/lib/services/config/config";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import { mode, setMode, toggleMode } from "mode-watcher";

export function toggleThemeMode() {
	toggleMode();
	updateDefaultMapStyle();
	getUserSettings().themeMode = mode?.current ?? "system";
	updateUserSettings();
}

export function setThemeMode(newMode: "dark" | "light" | "system") {
	setMode(newMode);
	updateDefaultMapStyle();
	getUserSettings().themeMode = newMode;
	updateUserSettings();
}

export function updateDefaultMapStyle() {
	const mapStyle = getDefaultMapStyle();
	getUserSettings().mapStyle.id = mapStyle.id;
	getUserSettings().mapStyle.url = mapStyle.url;
}

export function getDefaultMapStyle(theme: "light" | "dark" | undefined = undefined) {
	return (
		getConfig().mapStyles.find((s) => s.default === (theme ?? mode.current)) ??
		getConfig().mapStyles[0]
	);
}

export function isDarkMode() {
	return mode?.current === "dark";
}
