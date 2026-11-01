import { isNative } from "@/lib/native/runtime";
import { Capacitor } from "@capacitor/core";

/**
 * Native-only display setup, run once at boot:
 *  - opt the viewport into the device safe areas (`viewport-fit=cover`) so that
 *    `env(safe-area-inset-*)` resolves to the real notch/status/nav-bar insets.
 *    Done here (not in app.html) so the web build's viewport is untouched.
 *  - keep Android's status bar outside the WebView on older releases, where
 *    CSS safe-area insets are unreliable. On Android 15+, MainActivity handles
 *    side margins and forwards the top/bottom safe areas and keyboard insets.
 *    iOS uses CSS safe areas.
 */
export function installNativeUi(): void {
	if (!isNative()) return;

	// Modern Android WebViews shrink the visual viewport for the keyboard while
	// fixed elements still use the layout viewport. Keep app overlays inside the
	// part of the page that is actually visible, including after rotation.
	const updateViewport = () => {
		const viewport = window.visualViewport;
		if (viewport && viewport.scale !== 1) return;
		document.documentElement.style.setProperty(
			"--native-viewport-height",
			`${viewport?.height ?? window.innerHeight}px`
		);
		document.documentElement.style.setProperty(
			"--native-viewport-top",
			`${viewport?.offsetTop ?? 0}px`
		);
	};
	window.visualViewport?.addEventListener("resize", updateViewport);
	window.visualViewport?.addEventListener("scroll", updateViewport);
	window.addEventListener("resize", updateViewport);
	updateViewport();

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
			await StatusBar.setOverlaysWebView({ overlay: Capacitor.getPlatform() !== "android" });
			await StatusBar.setStyle({ style: Style.Default });
		} catch (e) {
			// status-bar plugin is Android/iOS only; ignore elsewhere
			console.error("Failed to configure native status bar", e);
		}
	})();
}
