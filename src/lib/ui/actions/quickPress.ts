export const longPressDuration = 500;
export const pressMoveTolerance = 8;

/** Hold and release opens actions; moving cancels so scrolling and sorting can take over. */
export function quickPress(node: HTMLElement, open: (x: number, y: number) => void) {
	let press: { id: number; x: number; y: number; started: number } | undefined;
	let suppressClickUntil = 0;
	let touchContextUntil = 0;
	const controller = new AbortController();
	const options = { signal: controller.signal };

	node.addEventListener(
		"pointerdown",
		(event) => {
			if (!event.isPrimary || event.button !== 0) {
				press = undefined;
				return;
			}
			suppressClickUntil = 0;
			if (event.pointerType === "mouse") {
				touchContextUntil = 0;
				return;
			}
			touchContextUntil = Infinity;
			press = { id: event.pointerId, x: event.clientX, y: event.clientY, started: Date.now() };
		},
		options
	);
	window.addEventListener(
		"pointermove",
		(event) => {
			if (press?.id !== event.pointerId) return;
			if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > pressMoveTolerance)
				press = undefined;
		},
		options
	);
	window.addEventListener(
		"pointerup",
		(event) => {
			if (event.pointerType !== "mouse") touchContextUntil = Date.now() + 800;
			if (press?.id !== event.pointerId) return;
			const held = press;
			press = undefined;
			if (Date.now() - held.started < longPressDuration) return;
			suppressClickUntil = Date.now() + 800;
			open(held.x, held.y);
		},
		options
	);
	window.addEventListener(
		"pointercancel",
		() => {
			press = undefined;
			touchContextUntil = Date.now() + 800;
		},
		options
	);
	window.addEventListener(
		"blur",
		() => {
			press = undefined;
		},
		options
	);
	node.addEventListener(
		"contextmenu",
		(event) => {
			event.preventDefault();
			// Touch browsers may fire a native contextmenu before the finger is released.
			if (press || Date.now() < touchContextUntil || Date.now() < suppressClickUntil) return;
			open(event.clientX, event.clientY);
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

	return () => controller.abort();
}
