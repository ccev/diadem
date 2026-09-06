export type optionalFeatures =
	"koji" | "geocoding" | "auth" | "authRequired" | "showFullscreenLogin" | "geometryLookup";

export type SupportedFeatures = {
	[key in optionalFeatures]: boolean;
};

let supportedFeatures: SupportedFeatures = {
	koji: false,
	geocoding: false,
	auth: false,
	authRequired: false,
	showFullscreenLogin: false,
	geometryLookup: false
};

export function isSupportedFeature(feature: optionalFeatures) {
	return Boolean(supportedFeatures[feature]);
}

export async function updateSupportedFeatures() {
	const response = await fetch("/api/supported-features", { headers: getHeaders() });
	if (response.ok) supportedFeatures = await parseResponse<SupportedFeatures>(response);
}
import { getHeaders, parseResponse } from "@/lib/utils/requests";
