import type { Snippet } from "svelte";
import type { DrawerHandle } from "./handle.js";

export type DrawerSwipeDirection = "up" | "down" | "left" | "right";
export type DrawerSnapPoint = number | string;
export type DrawerModal = boolean | "trap-focus";
export type DrawerChangeReason =
	| "trigger-press"
	| "outside-press"
	| "escape-key"
	| "close-watcher"
	| "close-press"
	| "focus-out"
	| "imperative-action"
	| "swipe"
	| "none";

export interface DrawerChangeEventDetails {
	reason: DrawerChangeReason;
	event?: Event;
	trigger?: HTMLElement;
	isCanceled: boolean;
	isPropagationAllowed: boolean;
	cancel(): void;
	allowPropagation(): void;
	preventUnmountOnClose(): void;
}

export interface DrawerRootActions {
	close(): void;
	unmount(): void;
}

export interface DrawerRootProps {
	children?: Snippet;
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean, details: DrawerChangeEventDetails) => void;
	onOpenChangeComplete?: (open: boolean) => void;
	modal?: DrawerModal;
	disablePointerDismissal?: boolean;
	closeOnOutsideClick?: boolean;
	swipeDirection?: DrawerSwipeDirection;
	snapPoints?: DrawerSnapPoint[];
	snapPoint?: DrawerSnapPoint | null;
	defaultSnapPoint?: DrawerSnapPoint | null;
	onSnapPointChange?: (
		snapPoint: DrawerSnapPoint | null,
		details: DrawerChangeEventDetails
	) => void;
	snapToSequentialPoints?: boolean;
	actionsRef?: DrawerRootActions | null;
	handle?: DrawerHandle;
}

export interface ResolvedSnapPoint {
	value: DrawerSnapPoint;
	height: number;
	offset: number;
}

export function createChangeDetails(
	reason: DrawerChangeReason,
	event?: Event,
	trigger?: HTMLElement
): DrawerChangeEventDetails {
	let canceled = false;
	let propagationAllowed = false;
	return {
		reason,
		event,
		trigger,
		get isCanceled() {
			return canceled;
		},
		get isPropagationAllowed() {
			return propagationAllowed;
		},
		cancel() {
			canceled = true;
		},
		allowPropagation() {
			propagationAllowed = true;
		},
		preventUnmountOnClose() {}
	};
}
