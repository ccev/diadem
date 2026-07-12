import type { Attachment } from "svelte/attachments";
import type { DrawerState } from "./context.svelte.js";

const INTERACTIVE = 'button,a,input,select,textarea,label,[role="button"]';
const CROSS_AXIS_THRESHOLD = 6;
const CROSS_AXIS_BIAS = 2;

function isScrollable(element: HTMLElement, vertical: boolean) {
	const style = getComputedStyle(element);
	const overflow = vertical ? style.overflowY : style.overflowX;
	return (
		/(auto|scroll)/.test(overflow) &&
		(vertical
			? element.scrollHeight > element.clientHeight
			: element.scrollWidth > element.clientWidth)
	);
}

function scrollableTarget(target: HTMLElement, root: HTMLElement, vertical: boolean) {
	let element: HTMLElement | null = target;
	while (element && element !== root) {
		if (isScrollable(element, vertical)) return element;
		element = element.parentElement;
	}
	return isScrollable(root, vertical) ? root : null;
}

function canTakeFromScrollEdge(element: HTMLElement, direction: string, delta: number) {
	if (direction === "down") return delta > 0 && element.scrollTop <= 0;
	if (direction === "up") {
		return delta < 0 && element.scrollTop >= element.scrollHeight - element.clientHeight - 1;
	}
	if (direction === "right") return delta > 0 && element.scrollLeft <= 0;
	return delta < 0 && element.scrollLeft >= element.scrollWidth - element.clientWidth - 1;
}

function isRangeInput(target: EventTarget | null) {
	return target instanceof HTMLInputElement && target.type === "range";
}

export function drawerGesture(state: DrawerState): Attachment<HTMLDivElement> {
	return (node) => {
		let pointerId: number | undefined;
		let touchId: number | undefined;
		let startX = 0;
		let startY = 0;
		let startTime = 0;
		let lastX = 0;
		let lastY = 0;
		let lastTime = 0;
		let releaseVelocityX = 0;
		let releaseVelocityY = 0;
		let axis: "x" | "y" | undefined;
		let scrollTarget: HTMLElement | null = null;
		let pending = false;
		let touchActive = false;
		let allowTouchSwipe: boolean | null = null;
		let preserveCrossAxisScroll = false;

		function begin(target: HTMLElement, x: number, y: number, time: number, touch: boolean) {
			if (!state.open || state.nestedOpenCount > 0 || !state.popup) return false;
			if (!state.popup.contains(target) || target.closest("[data-base-ui-swipe-ignore]"))
				return false;
			if (!touch) {
				if (target.closest("[data-drawer-content]") || target.closest(INTERACTIVE)) return false;
				const selection = document.getSelection();
				if (selection && !selection.isCollapsed) selection.removeAllRanges();
			}

			startX = lastX = x;
			startY = lastY = y;
			startTime = lastTime = time;
			releaseVelocityX = 0;
			releaseVelocityY = 0;
			axis = undefined;
			pending = true;
			preserveCrossAxisScroll = false;
			const vertical = state.swipeDirection === "up" || state.swipeDirection === "down";
			scrollTarget = touch ? scrollableTarget(target, state.popup, vertical) : null;
			allowTouchSwipe = scrollTarget ? null : true;
			return true;
		}

		function shouldExpandSnapPoint(delta: number, vertical: boolean) {
			if (!vertical || state.resolvedSnapPoints.length < 2) return false;
			const minimumOffset = Math.min(...state.resolvedSnapPoints.map((point) => point.offset));
			if (state.activeOffset <= minimumOffset + 1) return false;
			return state.swipeDirection === "down" ? delta < 0 : delta > 0;
		}

		function applyMove(x: number, y: number, time: number) {
			const dx = x - startX;
			const dy = y - startY;
			if (!axis && Math.hypot(dx, dy) >= 1) axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
			const vertical = state.swipeDirection === "up" || state.swipeDirection === "down";
			if ((vertical && axis === "x") || (!vertical && axis === "y")) return false;

			state.swiping = true;
			let movementX = vertical ? 0 : dx;
			let movementY = vertical ? dy : 0;
			const directionSign =
				state.swipeDirection === "up" || state.swipeDirection === "left" ? -1 : 1;
			const directional = (vertical ? movementY : movementX) * directionSign;
			if (directional < 0 && !state.resolvedSnapPoints.length) {
				const damped = -Math.sqrt(-directional);
				if (vertical) movementY = damped * directionSign;
				else movementX = damped * directionSign;
			}
			if (vertical && state.resolvedSnapPoints.length && state.swipeDirection === "down") {
				const nextOffset = state.activeOffset + movementY;
				if (nextOffset < 0) movementY = -Math.sqrt(-nextOffset) - state.activeOffset;
			}

			const elapsed = Math.max(16, time - lastTime);
			releaseVelocityX = (x - lastX) / elapsed;
			releaseVelocityY = (y - lastY) / elapsed;
			lastX = x;
			lastY = y;
			lastTime = time;
			state.setMovement(movementX, movementY);
			return true;
		}

		function finish(event: Event, x: number, y: number, time: number) {
			if (!pending) return;
			pending = false;
			if (!state.swiping) return;
			const duration = Math.max(50, time - startTime);
			const velocityX = (x - startX) / duration;
			const velocityY = (y - startY) / duration;
			const stale = time - lastTime > 80;
			state.finishSwipe(
				state.movementX,
				state.movementY,
				stale ? velocityX : releaseVelocityX || velocityX,
				stale ? velocityY : releaseVelocityY || velocityY,
				event
			);
		}

		function pointerDown(event: PointerEvent) {
			if (event.pointerType === "touch" || event.button !== 0) return;
			if (
				!begin(event.target as HTMLElement, event.clientX, event.clientY, event.timeStamp, false)
			) {
				return;
			}
			pointerId = event.pointerId;
			try {
				node.setPointerCapture(event.pointerId);
			} catch {}
		}

		function pointerMove(event: PointerEvent) {
			if (!pending || event.pointerId !== pointerId || event.pointerType === "touch") return;
			if (event.buttons === 0) {
				pointerUp(event);
				return;
			}
			event.preventDefault();
			applyMove(event.clientX, event.clientY, event.timeStamp);
		}

		function pointerUp(event: PointerEvent) {
			if (!pending || event.pointerId !== pointerId || event.pointerType === "touch") return;
			try {
				node.releasePointerCapture(event.pointerId);
			} catch {}
			finish(event, event.clientX, event.clientY, event.timeStamp);
		}

		function touchStart(event: TouchEvent) {
			if (event.touches.length !== 1 || isRangeInput(event.target)) return;
			const touch = event.touches[0];
			if (
				!begin(event.target as HTMLElement, touch.clientX, touch.clientY, event.timeStamp, true)
			) {
				return;
			}
			touchId = touch.identifier;
			touchActive = true;
		}

		function activeTouch(touches: TouchList) {
			for (let index = 0; index < touches.length; index++) {
				if (touches[index].identifier === touchId) return touches[index];
			}
			return null;
		}

		function touchMove(event: TouchEvent) {
			if (!touchActive || event.touches.length !== 1 || isRangeInput(event.target)) return;
			const touch = activeTouch(event.touches);
			if (!touch) return;
			const dx = touch.clientX - startX;
			const dy = touch.clientY - startY;
			const vertical = state.swipeDirection === "up" || state.swipeDirection === "down";
			const drawerDelta = vertical ? dy : dx;
			const crossDelta = vertical ? dx : dy;

			if (
				preserveCrossAxisScroll ||
				(Math.abs(crossDelta) >= CROSS_AXIS_THRESHOLD &&
					Math.abs(crossDelta) > Math.abs(drawerDelta) + CROSS_AXIS_BIAS)
			) {
				preserveCrossAxisScroll = true;
				lastX = touch.clientX;
				lastY = touch.clientY;
				return;
			}

			if (allowTouchSwipe !== true) {
				if (shouldExpandSnapPoint(drawerDelta, vertical)) {
					allowTouchSwipe = true;
				} else if (
					!scrollTarget ||
					canTakeFromScrollEdge(scrollTarget, state.swipeDirection, drawerDelta)
				) {
					allowTouchSwipe = event.cancelable;
				} else {
					allowTouchSwipe = false;
				}
			}

			if (allowTouchSwipe !== true) {
				lastX = touch.clientX;
				lastY = touch.clientY;
				return;
			}
			if (event.cancelable) event.preventDefault();
			event.stopPropagation();
			applyMove(touch.clientX, touch.clientY, event.timeStamp);
		}

		function touchEnd(event: TouchEvent) {
			if (!touchActive) return;
			const touch = activeTouch(event.changedTouches);
			if (!touch) return;
			touchActive = false;
			finish(event, touch.clientX, touch.clientY, event.timeStamp);
		}

		function touchCancel() {
			if (!touchActive) return;
			touchActive = false;
			pending = false;
			state.resetSwipe();
		}

		node.addEventListener("pointerdown", pointerDown);
		node.addEventListener("pointermove", pointerMove, { passive: false });
		node.addEventListener("pointerup", pointerUp);
		node.addEventListener("pointercancel", pointerUp);
		node.addEventListener("touchstart", touchStart, { passive: true });
		document.addEventListener("touchmove", touchMove, { passive: false, capture: true });
		document.addEventListener("touchend", touchEnd, { capture: true });
		document.addEventListener("touchcancel", touchCancel, { capture: true });
		return () => {
			node.removeEventListener("pointerdown", pointerDown);
			node.removeEventListener("pointermove", pointerMove);
			node.removeEventListener("pointerup", pointerUp);
			node.removeEventListener("pointercancel", pointerUp);
			node.removeEventListener("touchstart", touchStart);
			document.removeEventListener("touchmove", touchMove, true);
			document.removeEventListener("touchend", touchEnd, true);
			document.removeEventListener("touchcancel", touchCancel, true);
		};
	};
}
