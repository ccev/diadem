let isPopupExpanded_: boolean = $state(false)

export function isPopupExpanded() {
	return isPopupExpanded_
}

export function togglePopupExpanded() {
	isPopupExpanded_ = !isPopupExpanded_
}