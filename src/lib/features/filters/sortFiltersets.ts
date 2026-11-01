import Sortable from "sortablejs";
import { pressMoveTolerance } from "@/lib/ui/actions/quickPress";
import { closeQuickActions } from "@/lib/ui/quickActions.svelte";

export function sortFiltersets(node: HTMLElement, onMove: (from: number, to: number) => void) {
	let originalChildren: ChildNode[] = [];
	let suppressClickUntil = 0;
	let chosen: HTMLElement | undefined;
	const sortable = Sortable.create(node, {
		animation: 150,
		delay: 100,
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
		onChoose: ({ item }) => {
			originalChildren = Array.from(node.childNodes);
			chosen = item;
			// Until the touch delay expires, let the drawer handle swipes on the row.
			chosen.setAttribute("data-base-ui-swipe-ignore", "");
		},
		onUnchoose: () => {
			chosen?.removeAttribute("data-base-ui-swipe-ignore");
			chosen = undefined;
		},
		onStart: () => {
			closeQuickActions();
			node.dataset.sorting = "true";
			// Buttons explicitly enable pointer events; do not let the preview hide drop targets.
			for (const element of Sortable.ghost?.querySelectorAll<HTMLElement>("*") ?? [])
				element.style.pointerEvents = "none";
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
		chosen?.removeAttribute("data-base-ui-swipe-ignore");
		delete node.dataset.sorting;
		node.removeEventListener("pointerdown", resetClick);
		node.removeEventListener("click", suppressClick, true);
	};
}
