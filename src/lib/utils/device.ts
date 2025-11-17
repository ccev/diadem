import { innerWidth } from "svelte/reactivity/window";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { openToast } from "@/lib/ui/toasts.svelte.js";
import * as m from "@/lib/paraglide/messages";

export function isMenuSidebar() {
	return (innerWidth.current ?? 0) > 725;
}

export function isUiLeft() {
	return isMenuSidebar() || getUserSettings().isLeftHanded;
}

export function canNativeShare(content: ShareData) {
	return navigator?.share && navigator.canShare && navigator.canShare(content);
}

export function hasClipboardWrite() {
	return navigator.clipboard && navigator.clipboard.writeText;
}

export function copyToClipboard(content: string) {
	navigator.clipboard
		.writeText(content)
		.then(() => openToast(m.clipboard_copied()))
		.catch((e) => openToast(m.clipboard_error()));
}

export function canBackupShare(shareData: ShareData) {
	return canNativeShare(shareData) || hasClipboardWrite()
}

export function backupShareUrl(url: string) {
	const shareData = { url };
	if (canNativeShare(shareData)) {
		navigator.share(shareData).then();
	} else if (hasClipboardWrite()) {
		copyToClipboard(url);
	}
}