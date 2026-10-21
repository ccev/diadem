export const longPressDuration = 500;
export const pressMoveTolerance = 8;

/** Holding opens actions at the threshold; moving cancels so scrolling and sorting can take over. */
export function quickPress(node: HTMLElement, open: (x: number, y: number) => void) {
	let press: { id: number; x: number; y: number } | undefined;
	let pressTimer: ReturnType<typeof setTimeout> | undefined;
	let suppressClickUntil = 0;
	let touchContextUntil = 0;
	const controller = new AbortController();
	const options = { signal: controller.signal };

	function clearPress() {
		clearTimeout(pressTimer);
		pressTimer = undefined;
		press = undefined;
		if (suppressClickUntil === Infinity) suppressClickUntil = Date.now() + 800;
	}

	node.addEventListener(
		"pointerdown",
		(event) => {
			clearPress();
			if (!event.isPrimary || event.button !== 0) return;
			suppressClickUntil = 0;
			if (event.pointerType === "mouse") {
				touchContextUntil = 0;
				return;
			}
			touchContextUntil = Infinity;
			press = { id: event.pointerId, x: event.clientX, y: event.clientY };
			pressTimer = setTimeout(() => {
				pressTimer = undefined;
				if (!press) return;
				// Keep suppressing the synthetic click even if the finger stays down much longer.
				suppressClickUntil = Infinity;
				open(press.x, press.y);
			}, longPressDuration);
		},
		options
	);
	window.addEventListener(
		"pointermove",
		(event) => {
			if (press?.id !== event.pointerId) return;
			if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > pressMoveTolerance) {
				clearTimeout(pressTimer);
				pressTimer = undefined;
			}
		},
		options
	);
	window.addEventListener(
		"pointerup",
		(event) => {
			if (event.pointerType !== "mouse") touchContextUntil = Date.now() + 800;
			if (press?.id !== event.pointerId) return;
			clearPress();
		},
		options
	);
	window.addEventListener(
		"pointercancel",
		() => {
			clearPress();
			touchContextUntil = Date.now() + 800;
		},
		options
	);
	window.addEventListener("blur", clearPress, options);
	node.addEventListener(
		"contextmenu",
		(event) => {
			event.preventDefault();
			// Native touch context menus must not open early or reopen the hold menu.
			if (press || Date.now() < touchContextUntil || Date.now() < suppressClickUntil) return;
			open(event.clientX, event.clientY);
		},
		options
	);
	node.addEventListener(
		"mousedown",
		(event) => {
			// A touch's synthetic mousedown must not move focus back from the open menu.
			if (Date.now() < suppressClickUntil) event.preventDefault();
		},
		options
	);
	node.addEventListener(
		"click",
		(event) => {
			if (Date.now() >= suppressClickUntil) return;
			event.preventDefault();
			event.stopImmediatePropagation();
		},
		{ ...options, capture: true }
	);
	node.addEventListener(
		"keydown",
		(event) => {
			if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
			event.preventDefault();
			const bounds = node.getBoundingClientRect();
			open(bounds.left, bounds.bottom);
		},
		options
	);

	return () => {
		clearPress();
		controller.abort();
	};
}
