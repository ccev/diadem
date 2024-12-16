export function timestampToLocalTime(timestamp: number) {
	const date = new Date(timestamp * 1000);

	return date.toLocaleTimeString()
}
