import { isNative } from "@/lib/native/runtime";

/**
 * Native-only display setup, run once at boot:
 *  - opt the viewport into the device safe areas (`viewport-fit=cover`) so that
 *    `env(safe-area-inset-*)` resolves to the real notch/status/nav-bar insets.
 *    Done here (not in app.html) so the web build's viewport is untouched.
 *  - let the WebView draw behind a transparent status bar (the map is full-bleed;
 *    UI elements re-pad themselves via the safe-area insets).
 */
export function installNativeUi(): void {
	if (!isNative()) return;

	// Kill any service worker registered by an earlier build, it intercepts and
	// breaks cross-origin map tiles, and is unnecessary inside the native shell.
	if ("serviceWorker" in navigator) {
		navigator.serviceWorker
			.getRegistrations()
			.then((regs) => regs.forEach((r) => void r.unregister()))
			.catch(() => {});
	}

	const viewport = document.querySelector('meta[name="viewport"]');
	if (viewport) {
		const content = viewport.getAttribute("content") ?? "";
		if (!content.includes("viewport-fit")) {
			viewport.setAttribute("content", `${content}, viewport-fit=cover`);
		}
	}

	void (async () => {
		try {
			const { StatusBar, Style } = await import("@capacitor/status-bar");
			await StatusBar.setOverlaysWebView({ overlay: true });
			await StatusBar.setStyle({ style: Style.Default });
		} catch (e) {
			// status-bar plugin is Android/iOS only; ignore elsewhere
			console.error("Failed to configure native status bar", e);
		}
	})();
}
