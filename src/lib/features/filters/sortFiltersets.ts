import Sortable from "sortablejs";
import { longPressDuration, pressMoveTolerance } from "@/lib/ui/actions/quickPress";
import { closeQuickActions } from "@/lib/ui/quickActions.svelte";

export function sortFiltersets(node: HTMLElement, onMove: (from: number, to: number) => void) {
	let originalChildren: ChildNode[] = [];
	let suppressClickUntil = 0;
	const sortable = Sortable.create(node, {
		animation: 150,
		delay: longPressDuration,
		delayOnTouchOnly: true,
		touchStartThreshold: pressMoveTolerance,
		fallbackTolerance: pressMoveTolerance,
		forceFallback: true,
		fallbackOnBody: true,
		draggable: "[data-filterset]",
		filter: "[data-no-drag]",
		preventOnFilter: false,
		ghostClass: "opacity-30",
		chosenClass: "ring-2",
		onChoose: () => {
			originalChildren = Array.from(node.childNodes);
		},
		onStart: () => {
			closeQuickActions();
			node.dataset.sorting = "true";
		},
		onEnd: ({ oldDraggableIndex, newDraggableIndex }) => {
			delete node.dataset.sorting;
			suppressClickUntil = Date.now() + 800;
			// Restore the DOM before updating state; Svelte owns the keyed list.
			for (const child of originalChildren) node.appendChild(child);
			if (
				oldDraggableIndex !== undefined &&
				newDraggableIndex !== undefined &&
				oldDraggableIndex !== newDraggableIndex
			)
				onMove(oldDraggableIndex, newDraggableIndex);
		}
	});
	const suppressClick = (event: MouseEvent) => {
		if (Date.now() >= suppressClickUntil) return;
		event.preventDefault();
		event.stopImmediatePropagation();
	};
	const resetClick = () => {
		suppressClickUntil = 0;
	};
	node.addEventListener("pointerdown", resetClick);
	node.addEventListener("click", suppressClick, true);
	return () => {
		sortable.destroy();
		node.removeEventListener("pointerdown", resetClick);
		node.removeEventListener("click", suppressClick, true);
	};
}
