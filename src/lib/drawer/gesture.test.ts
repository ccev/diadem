import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DrawerState } from "./context.svelte";
import { drawerGesture } from "./gesture";

let node: HTMLDivElement;
let documentTarget: EventTarget;
let state: DrawerState;
let ignored: boolean;
let target: HTMLElement;
let cleanup: () => void;

function touch(type: string, y = 100) {
	const event = new Event(type, { cancelable: true });
	const point = { identifier: 1, clientX: 100, clientY: y };
	Object.defineProperty(event, "target", { value: target });
	Object.assign(event, {
		touches: type === "touchend" ? [] : [point],
		changedTouches: [point]
	});
	(type === "touchstart" ? node : documentTarget).dispatchEvent(event);
	return event;
}

beforeEach(() => {
	documentTarget = new EventTarget();
	vi.stubGlobal("document", documentTarget);
	vi.stubGlobal("HTMLInputElement", class {});
	vi.stubGlobal("getComputedStyle", () => ({ overflowX: "visible", overflowY: "visible" }));
	ignored = false;
	node = Object.assign(new EventTarget(), { contains: () => true }) as unknown as HTMLDivElement;
	target = {
		closest: () => (ignored ? target : null),
		parentElement: node
	} as unknown as HTMLElement;
	state = {
		open: true,
		nestedOpenCount: 0,
		popup: node,
		swipeDirection: "down",
		resolvedSnapPoints: [],
		swiping: false,
		setMovement: vi.fn(),
		finishSwipe: vi.fn(),
		resetSwipe: vi.fn(() => {
			state.swiping = false;
		})
	} as unknown as DrawerState;
	cleanup = drawerGesture(state)(node) as () => void;
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("drawer touch handoff", () => {
	it("allows swiping from an unlocked filterset row", () => {
		touch("touchstart");
		expect(touch("touchmove", 120).defaultPrevented).toBe(true);
		expect(state.setMovement).toHaveBeenCalledExactlyOnceWith(0, 20);
		touch("touchend", 120);
		expect(state.finishSwipe).toHaveBeenCalledOnce();
	});

	it("leaves already ignored controls to their child gesture", () => {
		ignored = true;
		touch("touchstart");
		expect(touch("touchmove", 120).defaultPrevented).toBe(false);
		expect(state.setMovement).not.toHaveBeenCalled();
	});

	it("yields an existing touch when a delayed child drag locks the row", () => {
		touch("touchstart");
		ignored = true;
		expect(touch("touchmove", 120).defaultPrevented).toBe(false);
		expect(state.resetSwipe).toHaveBeenCalledOnce();
		expect(state.setMovement).not.toHaveBeenCalled();
		ignored = false;
		touch("touchmove", 140);
		touch("touchend", 140);
		expect(state.setMovement).not.toHaveBeenCalled();
		expect(state.finishSwipe).not.toHaveBeenCalled();
	});

	it("resets slight drawer movement when the held row takes over", () => {
		touch("touchstart");
		touch("touchmove", 102);
		ignored = true;
		touch("touchmove", 120);
		expect(state.resetSwipe).toHaveBeenCalledOnce();
		expect(state.swiping).toBe(false);
		expect(state.setMovement).toHaveBeenCalledTimes(1);
	});

	it("allows the next touch to swipe the drawer after a filterset drag", () => {
		touch("touchstart");
		ignored = true;
		touch("touchmove", 120);
		touch("touchend", 120);
		ignored = false;
		touch("touchstart");
		expect(touch("touchmove", 120).defaultPrevented).toBe(true);
		expect(state.setMovement).toHaveBeenCalledExactlyOnceWith(0, 20);
	});
});
