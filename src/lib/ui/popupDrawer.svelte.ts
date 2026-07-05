type SnapPoint = string | number;

type PopupDrawerSnapPointBinding = {
	getActiveSnapPoint: () => SnapPoint;
	setActiveSnapPoint: (snapPoint: SnapPoint) => void;
	getInitialSnapPoint: () => SnapPoint;
	isExpanded: () => boolean;
};

let snapPointBinding: PopupDrawerSnapPointBinding | undefined;
let shouldRestoreExpandedSnapPoint = false;

export function bindPopupDrawerSnapPoint(binding: PopupDrawerSnapPointBinding) {
	snapPointBinding = binding;

	return () => {
		if (snapPointBinding === binding) {
			snapPointBinding = undefined;
			shouldRestoreExpandedSnapPoint = false;
		}
	};
}

export function resetPopupBaseDrawerSnapPoint() {
	const initialSnapPoint = snapPointBinding?.getInitialSnapPoint();
	if (initialSnapPoint !== undefined) {
		snapPointBinding?.setActiveSnapPoint(initialSnapPoint);
	}
}

export function rememberPopupBaseDrawerExpandedSnapPoint() {
	shouldRestoreExpandedSnapPoint = Boolean(snapPointBinding?.isExpanded());
}

export function restorePopupBaseDrawerExpandedSnapPoint() {
	if (shouldRestoreExpandedSnapPoint) {
		snapPointBinding?.setActiveSnapPoint(1);
	}
}

export function clearPopupBaseDrawerExpandedSnapPointRestore() {
	shouldRestoreExpandedSnapPoint = false;
}
