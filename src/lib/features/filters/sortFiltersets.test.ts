import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SortableOptions, SortableEvent } from "sortablejs";

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	destroy: vi.fn(),
	close: vi.fn(),
	previewChildren: vi.fn(() => [] as HTMLElement[])
}));
vi.mock("sortablejs", () => ({
	default: { create: mocks.create, ghost: { querySelectorAll: mocks.previewChildren } }
}));
vi.mock("@/lib/ui/quickActions.svelte", () => ({ closeQuickActions: mocks.close }));

import { sortFiltersets } from "./sortFiltersets";

let node: HTMLElement;
let item: HTMLElement;
let options: SortableOptions;
let onMove: ReturnType<typeof vi.fn<(from: number, to: number) => void>>;
let cleanup: () => void;

beforeEach(() => {
	vi.clearAllMocks();
	mocks.previewChildren.mockReturnValue([]);
	const attributes = new Map<string, string>();
	item = {
		setAttribute: (name: string, value: string) => attributes.set(name, value),
		removeAttribute: (name: string) => attributes.delete(name),
		hasAttribute: (name: string) => attributes.has(name)
	} as unknown as HTMLElement;
	node = Object.assign(new EventTarget(), {
		childNodes: [item],
		dataset: {} as DOMStringMap,
		appendChild: vi.fn()
	}) as unknown as HTMLElement;
	mocks.create.mockImplementation((_node: HTMLElement, settings: SortableOptions) => {
		options = settings;
		return { destroy: mocks.destroy };
	});
	onMove = vi.fn();
	cleanup = sortFiltersets(node, onMove);
});

afterEach(() => cleanup());

describe("filterset drag gestures", () => {
	it("uses a 100 ms touch-only delay and leaves the drawer unlocked beforehand", () => {
		expect(options.delay).toBe(100);
		expect(options.delayOnTouchOnly).toBe(true);
		expect(options.filter).toBe("[data-no-drag]");
		expect(options.preventOnFilter).toBe(false);
		expect(item.hasAttribute("data-base-ui-swipe-ignore")).toBe(false);
	});

	it("locks drawer swiping when the delay expires, not when dragging first moves", () => {
		options.onChoose?.({ item } as SortableEvent);
		expect(item.hasAttribute("data-base-ui-swipe-ignore")).toBe(true);
		expect(node.dataset.sorting).toBeUndefined();
		expect(mocks.close).not.toHaveBeenCalled();
	});

	it("unlocks the drawer after releasing a hold without dragging", () => {
		options.onChoose?.({ item } as SortableEvent);
		options.onUnchoose?.({ item } as SortableEvent);
		expect(item.hasAttribute("data-base-ui-swipe-ignore")).toBe(false);
		expect(onMove).not.toHaveBeenCalled();
	});

	it("keeps buttons in the drag preview from hiding destination rows", () => {
		const button = { style: { pointerEvents: "auto" } } as HTMLElement;
		mocks.previewChildren.mockReturnValue([button]);
		options.onStart?.({ item } as SortableEvent);
		expect(button.style.pointerEvents).toBe("none");
	});

	it("restores the keyed DOM before saving the reordered filtersets", () => {
		options.onChoose?.({ item } as SortableEvent);
		options.onStart?.({ item } as SortableEvent);
		expect(mocks.close).toHaveBeenCalledOnce();
		expect(node.dataset.sorting).toBe("true");
		options.onUnchoose?.({ item } as SortableEvent);
		options.onEnd?.({ oldDraggableIndex: 0, newDraggableIndex: 1 } as SortableEvent);
		expect(node.appendChild).toHaveBeenCalledWith(item);
		expect(onMove).toHaveBeenCalledExactlyOnceWith(0, 1);
		expect(vi.mocked(node.appendChild).mock.invocationCallOrder[0]).toBeLessThan(
			onMove.mock.invocationCallOrder[0]
		);
		expect(item.hasAttribute("data-base-ui-swipe-ignore")).toBe(false);
		expect(node.dataset.sorting).toBeUndefined();
		expect(node.dispatchEvent(new Event("click", { cancelable: true }))).toBe(false);
	});

	it("removes the swipe lock when the list is detached during a hold", () => {
		options.onChoose?.({ item } as SortableEvent);
		options.onStart?.({ item } as SortableEvent);
		cleanup();
		cleanup = () => {};
		expect(mocks.destroy).toHaveBeenCalledOnce();
		expect(item.hasAttribute("data-base-ui-swipe-ignore")).toBe(false);
		expect(node.dataset.sorting).toBeUndefined();
	});
});
