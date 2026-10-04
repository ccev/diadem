import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { longPressDuration, quickPress } from "./quickPress";

function dispatch(target: EventTarget, type: string, props: Record<string, unknown> = {}) {
	const event = new Event(type, { cancelable: true });
	Object.assign(
		event,
		{ isPrimary: true, button: 0, pointerId: 1, pointerType: "touch", clientX: 20, clientY: 30 },
		props
	);
	target.dispatchEvent(event);
	return event;
}

let node: HTMLElement;
let windowTarget: EventTarget;
let open: ReturnType<typeof vi.fn<(x: number, y: number) => void>>;
let cleanup: () => void;
beforeEach(() => {
	vi.useFakeTimers();
	windowTarget = new EventTarget();
	vi.stubGlobal("window", windowTarget);
	node = new EventTarget() as HTMLElement;
	open = vi.fn();
	cleanup = quickPress(node, open);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("filterset quick presses", () => {
	it("keeps taps as normal clicks", () => {
		dispatch(node, "pointerdown");
		vi.advanceTimersByTime(100);
		dispatch(windowTarget, "pointerup");
		expect(open).not.toHaveBeenCalled();
		expect(dispatch(node, "click").defaultPrevented).toBe(false);
	});
	it("opens after holding and releasing, suppressing the synthetic click", () => {
		dispatch(node, "pointerdown");
		vi.advanceTimersByTime(longPressDuration);
		dispatch(windowTarget, "pointerup");
		expect(open).toHaveBeenCalledExactlyOnceWith(20, 30);
		expect(dispatch(node, "click").defaultPrevented).toBe(true);
	});
	it("allows a deliberate tap immediately after dismissing a hold menu", () => {
		dispatch(node, "pointerdown");
		vi.advanceTimersByTime(longPressDuration);
		dispatch(windowTarget, "pointerup");
		dispatch(node, "click");
		dispatch(node, "pointerdown");
		dispatch(windowTarget, "pointerup");
		expect(dispatch(node, "click").defaultPrevented).toBe(false);
	});

	it.each(["pointercancel", "blur"])("cancels on %s", (type) => {
		dispatch(node, "pointerdown");
		dispatch(windowTarget, type);
		vi.advanceTimersByTime(longPressDuration);
		dispatch(windowTarget, "pointerup");
		expect(open).not.toHaveBeenCalled();
	});
	it("leaves dragging and scrolling to the list", () => {
		dispatch(node, "pointerdown");
		vi.advanceTimersByTime(longPressDuration);
		dispatch(windowTarget, "pointermove", { clientY: 60 });
		dispatch(windowTarget, "pointerup");
		expect(open).not.toHaveBeenCalled();
	});
	it("does not open early when a native touch context menu fires", () => {
		dispatch(node, "pointerdown");
		vi.advanceTimersByTime(longPressDuration);
		expect(dispatch(node, "contextmenu").defaultPrevented).toBe(true);
		expect(open).not.toHaveBeenCalled();
		dispatch(windowTarget, "pointerup");
		dispatch(node, "contextmenu");
		expect(open).toHaveBeenCalledTimes(1);
	});
	it("opens on a desktop right click but not a held left click", () => {
		dispatch(node, "pointerdown", { pointerType: "mouse" });
		vi.advanceTimersByTime(longPressDuration);
		dispatch(windowTarget, "pointerup", { pointerType: "mouse" });
		expect(open).not.toHaveBeenCalled();
		expect(dispatch(node, "contextmenu").defaultPrevented).toBe(true);
		expect(open).toHaveBeenCalledTimes(1);
	});
	it("removes listeners when detached", () => {
		dispatch(node, "pointerdown");
		cleanup();
		vi.advanceTimersByTime(longPressDuration);
		dispatch(windowTarget, "pointerup");
		dispatch(node, "contextmenu");
		expect(open).not.toHaveBeenCalled();
	});
});
