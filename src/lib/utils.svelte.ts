import { getUserSettings } from '@/lib/userSettings.svelte';
import { openToast } from '@/components/ui/toast/toastUtils.svelte';
import * as m from "@/lib/paraglide/messages"

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

let loadedImages: {[key: string]: HTMLImageElement | ImageBitmap} = $state({})

export function getLoadedImages() {
	return loadedImages
}

export function canNativeShare(content: ShareData) {
	return navigator.share && navigator.canShare && navigator.canShare(content)
}

export function hasClipboardWrite() {
	return navigator.clipboard && navigator.clipboard.writeText
}

export function copyToClipboard(content: string) {
	navigator.clipboard.writeText(content)
		.then(() => openToast(m.clipboard_copied()))
		.catch(e => openToast(m.clipboard_error()))
}

export function getMapsUrl(lat: number, lon: number) {
	return `https://maps.google.com?q=${lat},${lon}`
}