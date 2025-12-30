export function time(date1: Date, date2: Date) {
	return (
		date1.getDate() === date2.getDate() &&
		date1.getMonth() === date2.getMonth() &&
		date1.getFullYear() === date2.getFullYear()
	);
}

export function getMmSsFromSeconds(seconds: number) {
	const mm = (seconds / 60).toFixed(0).padStart(2, "0")
	const ss = (seconds % 60).toFixed(0).padStart(2, "0")

	return mm + ":" + ss
}