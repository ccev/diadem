import { getContext, hasContext, setContext } from "svelte";
import type {
	DrawerChangeEventDetails,
	DrawerChangeReason,
	DrawerModal,
	DrawerRootActions,
	DrawerSnapPoint,
	DrawerSwipeDirection,
	ResolvedSnapPoint
} from "./types.js";
import { createChangeDetails } from "./types.js";

export interface DrawerOptions {
	getOpen: () => boolean;
	setOpen: (open: boolean) => void;
	getModal: () => DrawerModal;
	getDisablePointerDismissal: () => boolean;
	getSwipeDirection: () => DrawerSwipeDirection;
	getSnapPoints: () => DrawerSnapPoint[] | undefined;
	getSnapPoint: () => DrawerSnapPoint | null | undefined;
	setSnapPoint: (point: DrawerSnapPoint | null) => void;
	getDefaultSnapPoint: () => DrawerSnapPoint | null;
	getSequential: () => boolean;
	onOpenChange: (open: boolean, details: DrawerChangeEventDetails) => void;
	onSnapPointChange: (point: DrawerSnapPoint | null, details: DrawerChangeEventDetails) => void;
}

export class DrawerState {
	readonly id: string;
	readonly popupId: string;
	readonly parent?: DrawerState;
	readonly options: DrawerOptions;
	popup = $state<HTMLDivElement>();
	viewport = $state<HTMLDivElement>();
	backdrop = $state<HTMLDivElement>();
	trigger = $state<HTMLElement>();
	popupHeight = $state(0);
	viewportHeight = $state(0);
	frontmostHeight = $state(0);
	nestedOpenCount = $state(0);
	nestedPresenceCount = $state(0);
	nestedSwiping = $state(false);
	nestedProgress = $state(0);
	swiping = $state(false);
	swipeDismissed = $state(false);
	starting = $state(false);
	ending = $state(false);
	mounted = $state(false);
	movementX = $state(0);
	movementY = $state(0);
	swipeProgress = $state(0);
	swipeStrength = $state(1);
	resolvedSnapPoints = $state<ResolvedSnapPoint[]>([]);
	activeOffset = $state(0);
	openSwipeActive = $state(false);
	private resizeObserver?: ResizeObserver;
	private layoutResolved = false;
	private startingFrame?: number;

	constructor(id: string, options: DrawerOptions, parent?: DrawerState) {
		this.id = id;
		this.popupId = `${id}-popup`;
		this.options = options;
		this.parent = parent;
	}

	get open() {
		return this.options.getOpen();
	}

	get modal() {
		return this.options.getModal();
	}

	get swipeDirection() {
		return this.options.getSwipeDirection();
	}

	get snapPoint() {
		return this.options.getSnapPoint();
	}

	requestOpen(
		open: boolean,
		reason: DrawerChangeReason = "none",
		event?: Event,
		trigger?: HTMLElement
	) {
		if (open === this.open) return false;
		const details = createChangeDetails(reason, event, trigger);
		this.options.onOpenChange(open, details);
		if (details.isCanceled) {
			this.resetSwipe();
			return false;
		}

		if (!open) {
			this.cancelStartingEnd();
			const points = this.options.getSnapPoints();
			if (points?.length) this.changeSnapPoint(this.options.getDefaultSnapPoint(), details);
			this.ending = true;
		} else {
			this.mounted = true;
			this.starting = true;
			this.queueStartingEnd();
		}
		this.options.setOpen(open);
		return true;
	}

	syncOpen(open: boolean) {
		if (open) {
			this.ending = false;
			this.mounted = true;
			this.starting = true;
			this.queueStartingEnd();
		} else if (this.mounted) {
			this.cancelStartingEnd();
			this.starting = false;
			this.ending = true;
		}
	}

	changeSnapPoint(point: DrawerSnapPoint | null, details = createChangeDetails("none")) {
		this.options.onSnapPointChange(point, details);
		if (!details.isCanceled) this.options.setSnapPoint(point);
		this.resolveSnapPoints();
	}

	setPopup(node?: HTMLDivElement) {
		this.resizeObserver?.disconnect();
		this.popup = node;
		if (!node) return;
		const measure = () => {
			const height = node.offsetHeight;
			if (height > 0 && this.nestedPresenceCount === 0) {
				this.popupHeight = height;
				this.frontmostHeight = height;
				this.parent?.setNestedHeight(height);
				this.resolveSnapPoints();
			}
			this.queueStartingEnd();
		};
		measure();
		if (typeof ResizeObserver !== "undefined") {
			this.resizeObserver = new ResizeObserver(measure);
			this.resizeObserver.observe(node);
		}
	}

	setViewport(node?: HTMLDivElement) {
		this.viewport = node;
		this.viewportHeight = node?.offsetHeight || document.documentElement.clientHeight;
		this.resolveSnapPoints();
		this.queueStartingEnd();
	}

	setNestedHeight(height: number) {
		this.frontmostHeight = height || this.popupHeight;
		this.parent?.setNestedHeight(this.frontmostHeight);
	}

	setNestedOpen(open: boolean) {
		this.nestedOpenCount = Math.max(0, this.nestedOpenCount + (open ? 1 : -1));
		this.parent?.setNestedOpen(open);
	}

	setNestedPresence(present: boolean) {
		this.nestedPresenceCount = Math.max(0, this.nestedPresenceCount + (present ? 1 : -1));
		this.parent?.setNestedPresence(present);
	}

	setNestedSwipe(swiping: boolean, progress = 0) {
		this.nestedSwiping = swiping;
		this.nestedProgress = progress;
		this.parent?.setNestedSwipe(swiping, progress);
	}

	resolveSnapPoints() {
		const points = this.options.getSnapPoints();
		if (!points?.length) {
			this.resolvedSnapPoints = [];
			this.activeOffset = 0;
			if (this.popupHeight) this.markLayoutResolved();
			return;
		}
		if (!this.popupHeight || !this.viewportHeight) {
			this.resolvedSnapPoints = [];
			this.activeOffset = 0;
			return;
		}
		const rootSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
		const maxHeight = Math.min(this.popupHeight, this.viewportHeight);
		const resolved = points
			.map((value): ResolvedSnapPoint | null => {
				let height: number;
				if (typeof value === "number") {
					if (!Number.isFinite(value)) return null;
					height = value <= 1 ? Math.max(0, value) * this.viewportHeight : value;
				} else if (value.trim().endsWith("px")) {
					height = Number.parseFloat(value);
				} else if (value.trim().endsWith("rem")) {
					height = Number.parseFloat(value) * rootSize;
				} else return null;
				if (!Number.isFinite(height)) return null;
				height = Math.min(maxHeight, Math.max(0, height));
				return { value, height, offset: Math.max(0, this.popupHeight - height) };
			})
			.filter((point): point is ResolvedSnapPoint => point !== null);
		const deduped: ResolvedSnapPoint[] = [];
		for (let index = resolved.length - 1; index >= 0; index--) {
			if (!deduped.some((point) => Math.abs(point.height - resolved[index].height) <= 1)) {
				deduped.unshift(resolved[index]);
			}
		}
		this.resolvedSnapPoints = deduped;
		let active = deduped.find((point) => Object.is(point.value, this.snapPoint));
		if (!active && this.snapPoint != null) {
			const requestedPoint = this.snapPoint;
			active = deduped.reduce<ResolvedSnapPoint | undefined>((closest, point) => {
				if (!closest) return point;
				const numeric =
					typeof requestedPoint === "number" ? requestedPoint : Number.parseFloat(requestedPoint);
				return Math.abs(point.height - numeric) < Math.abs(closest.height - numeric)
					? point
					: closest;
			}, undefined);
		}
		active ??= deduped[0];
		this.activeOffset = active?.offset ?? 0;
		if (active) this.markLayoutResolved();
	}

	private markLayoutResolved() {
		const firstResolution = !this.layoutResolved;
		this.layoutResolved = true;
		if (firstResolution && this.starting) {
			this.cancelStartingEnd();
			this.starting = false;
			return;
		}
		this.queueStartingEnd();
	}

	private queueStartingEnd() {
		if (!this.starting || !this.popupHeight || this.startingFrame !== undefined) return;
		const points = this.options.getSnapPoints();
		if (points?.length && (!this.viewportHeight || !this.resolvedSnapPoints.length)) return;

		this.startingFrame = requestAnimationFrame(() => {
			this.startingFrame = requestAnimationFrame(() => {
				this.startingFrame = undefined;
				this.starting = false;
			});
		});
	}

	private cancelStartingEnd() {
		if (this.startingFrame === undefined) return;
		cancelAnimationFrame(this.startingFrame);
		this.startingFrame = undefined;
	}

	setMovement(x: number, y: number) {
		this.movementX = x;
		this.movementY = y;
		const distance = this.swipeDirection === "left" || this.swipeDirection === "right" ? x : y;
		const directional =
			this.swipeDirection === "left" || this.swipeDirection === "up" ? -distance : distance;
		const size =
			this.swipeDirection === "left" || this.swipeDirection === "right"
				? (this.popup?.offsetWidth ?? 1)
				: this.popupHeight || 1;
		this.swipeProgress = Math.min(1, Math.max(0, directional / size));
		if (this.parent && Math.abs(distance) >= 10)
			this.parent.setNestedSwipe(true, this.swipeProgress);
	}

	finishSwipe(deltaX: number, deltaY: number, velocityX: number, velocityY: number, event: Event) {
		const vertical = this.swipeDirection === "up" || this.swipeDirection === "down";
		const rawDelta = vertical ? deltaY : deltaX;
		const rawVelocity = vertical ? velocityY : velocityX;
		const sign = this.swipeDirection === "up" || this.swipeDirection === "left" ? -1 : 1;
		const delta = rawDelta * sign;
		const velocity = rawVelocity * sign;
		const size = vertical ? this.popupHeight : (this.popup?.offsetWidth ?? 0);

		if (vertical && this.resolvedSnapPoints.length) {
			const dragTarget = Math.min(size, Math.max(0, this.activeOffset + delta));
			if (velocity >= 0.5 && !this.options.getSequential()) {
				this.dismissBySwipe(event, size, delta, velocity);
				return;
			}
			const projected = this.options.getSequential()
				? dragTarget
				: Math.min(
						size,
						Math.max(0, dragTarget + (Math.abs(velocity) >= 0.5 ? velocity * 300 : 0))
					);
			let closest = this.resolvedSnapPoints[0];
			for (const point of this.resolvedSnapPoints) {
				if (Math.abs(point.offset - projected) < Math.abs(closest.offset - projected))
					closest = point;
			}
			if (Math.abs(size - projected) < Math.abs(closest.offset - projected)) {
				this.dismissBySwipe(event, size, delta, velocity);
			} else {
				this.changeSnapPoint(closest.value, createChangeDetails("swipe", event));
				this.resetSwipe();
			}
			return;
		}

		if (delta >= Math.max(size * 0.5, 10) || velocity >= 0.5) {
			this.dismissBySwipe(event, size, delta, velocity);
		} else this.resetSwipe();
	}

	private dismissBySwipe(event: Event, size: number, delta: number, velocity: number) {
		const remaining = Math.max(0, size - delta);
		if (velocity > 0.2) {
			const duration = Math.min(
				360,
				Math.max(80, remaining / Math.min(4, Math.max(0.2, velocity)))
			);
			this.swipeStrength = Math.min(1, Math.max(0.1, 0.1 + ((duration - 80) / 280) * 0.9));
		}
		this.swipeDismissed = true;
		this.swiping = false;
		this.parent?.setNestedSwipe(false, 0);
		if (!this.requestOpen(false, "swipe", event)) {
			const vertical = this.swipeDirection === "up" || this.swipeDirection === "down";
			if (vertical && this.resolvedSnapPoints.length) {
				const dragTarget = Math.min(size, Math.max(0, this.activeOffset + delta));
				let closest = this.resolvedSnapPoints[0];
				for (const point of this.resolvedSnapPoints) {
					if (Math.abs(point.offset - dragTarget) < Math.abs(closest.offset - dragTarget))
						closest = point;
				}
				this.changeSnapPoint(closest.value, createChangeDetails("swipe", event));
			}
			this.resetSwipe();
		}
	}

	resetSwipe() {
		this.swiping = false;
		this.swipeDismissed = false;
		this.movementX = 0;
		this.movementY = 0;
		this.swipeProgress = 0;
		this.swipeStrength = 1;
		this.parent?.setNestedSwipe(false, 0);
	}

	complete(open: boolean) {
		this.cancelStartingEnd();
		this.starting = false;
		this.ending = false;
		if (!open) {
			this.mounted = false;
			this.resetSwipe();
		}
	}

	destroy() {
		this.cancelStartingEnd();
		this.resizeObserver?.disconnect();
		if (this.open) this.parent?.setNestedOpen(false);
	}
}

export interface DrawerProviderState {
	drawers: Map<string, boolean>;
	active: boolean;
	swipeProgress: number;
	frontmostHeight: number;
}

const DRAWER_CONTEXT = Symbol("base-ui-drawer");
const PROVIDER_CONTEXT = Symbol("base-ui-drawer-provider");

export const getDrawerContext = () => getContext<DrawerState>(DRAWER_CONTEXT);
export const getOptionalDrawerContext = () =>
	hasContext(DRAWER_CONTEXT) ? getContext<DrawerState>(DRAWER_CONTEXT) : undefined;
export const setDrawerContext = (state: DrawerState) => setContext(DRAWER_CONTEXT, state);
export const setOptionalDrawerContext = setDrawerContext;
export const getDrawerProviderContext = () =>
	hasContext(PROVIDER_CONTEXT) ? getContext<DrawerProviderState>(PROVIDER_CONTEXT) : undefined;
export const setDrawerProviderContext = (state: DrawerProviderState) =>
	setContext(PROVIDER_CONTEXT, state);

export function createActions(state: DrawerState): DrawerRootActions {
	return {
		close: () => state.requestOpen(false, "imperative-action"),
		unmount: () => {
			state.mounted = false;
		}
	};
}
