import { tick } from 'svelte';

let isToastOpen: boolean = $state(false)
let toastText: string = $state("Copied to clipboard")
let timeout: NodeJS.Timeout | undefined = undefined

function _openToast(text: string, ms: number) {
	toastText = text
	isToastOpen = true
	timeout = setTimeout(() => isToastOpen = false, ms)
}

export function openToast(text: string, ms: number = 1500) {
	if (isToastOpen) {
		console.log("toast already open")
		clearTimeout(timeout)
		console.log(timeout)
		isToastOpen = false

		setTimeout(() => _openToast(text, ms), 50)
	} else {
		_openToast(text, ms)
	}
}

export function getToastText() {
	return toastText
}

export function getIsToastOpen() {
	return isToastOpen
}

export function closeToast() {
	clearTimeout(timeout)
	isToastOpen = false
}
