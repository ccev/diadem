export type optionalFeatures = "koji" | "geocoding" | "auth" | "authRequired"

export type SupportedFeatures = {
	[ key in optionalFeatures ]: boolean
}

let supportedFeatures: SupportedFeatures = {
	koji: false,
	geocoding: false,
	auth: false,
	authRequired: false
}

export function isSupportedFeature(feature: optionalFeatures) {
	return Boolean(supportedFeatures[feature])
}

export async function updateSupportedFeatures() {
	const resp = await fetch("/api/supported-features")
	const data: SupportedFeatures = await resp.json()

	if (!Object.keys(data).includes("koji")) return

	supportedFeatures = data
}