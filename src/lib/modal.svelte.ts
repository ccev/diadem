let isModalOpenState: boolean = $state(false)

export function isModalOpen() {
	return isModalOpenState
}

export function openModal() {
	isModalOpenState = true
}

export function closeModal() {
	isModalOpenState = false
}
