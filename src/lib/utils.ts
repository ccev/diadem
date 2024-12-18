import { getUserSettings } from '@/lib/userSettings.svelte';

export function timestampToLocalTime(timestamp: number | null) {
	if (!timestamp) return '';

	const date = new Date(timestamp * 1000);
	return date.toLocaleTimeString();
}

export function updateDarkMode() {
	function isDark() {
		if (getUserSettings().isDarkMode == null)
			return window.matchMedia('(prefers-color-scheme: dark)').matches;
		return getUserSettings().isDarkMode ?? false;
	}
	document.documentElement.classList[isDark() ? 'add' : 'remove']('dark');
}