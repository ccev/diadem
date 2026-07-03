import * as m from "@/lib/paraglide/messages";
import { getUserSettings } from "@/lib/services/userSettings.svelte";
import { isNative } from "@/lib/native/runtime";
import { openToast } from "@/lib/ui/toasts.svelte.js";
import { innerWidth } from "svelte/reactivity/window";

export function isMenuSidebar() {
	return (innerWidth.current ?? 0) > 725;
}

export function isAllowedTwoSidebars() {
	return isMenuSidebar() && (innerWidth.current ?? 0) > 1170;
}

export function isUiLeft() {
	return isMenuSidebar() || getUserSettings().isLeftHanded;
}

export function canNativeShare(content: ShareData) {
	if (isNative()) return true;
	return navigator?.share != null && navigator.canShare && navigator.canShare(content);
}

export function hasClipboardWrite() {
	if (isNative()) return true;
	return Boolean(navigator.clipboard && navigator.clipboard.writeText);
}

export function copyToClipboard(content: string) {
	if (isNative()) {
		void import("@capacitor/clipboard")
			.then(({ Clipboard }) => Clipboard.write({ string: content }))
			.then(() => openToast(m.clipboard_copied()))
			.catch(() => openToast(m.clipboard_error()));
		return;
	}
	navigator.clipboard
		.writeText(content)
		.then(() => openToast(m.clipboard_copied()))
		.catch((e) => openToast(m.clipboard_error()));
}

export function canBackupShare(shareData: ShareData) {
	return canNativeShare(shareData) || hasClipboardWrite();
}

export function backupShareUrl(url: string) {
	if (isNative()) {
		void import("@capacitor/share")
			.then(({ Share }) => Share.share({ url }))
			.catch(() => {
				// user cancelled the share sheet, or sharing failed — ignore
			});
		return;
	}
	const shareData = { url };
	if (canNativeShare(shareData)) {
		navigator.share(shareData).then();
	} else if (hasClipboardWrite()) {
		copyToClipboard(url);
	}
}

export function hasTouch() {
	return (
		"ontouchstart" in window ||
		(navigator?.maxTouchPoints ?? 0) > 0 ||
		((navigator as any)?.msMaxTouchPoints ?? 0) > 0
	);
}

export function isMobileWebKit() {
	return (
		/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		(navigator.userAgent.includes("Mac") && navigator.maxTouchPoints > 1)
	);
}
