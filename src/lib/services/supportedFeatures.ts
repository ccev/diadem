export type optionalFeatures =
	| "koji"
	| "biomes"
	| "geocoding"
	| "auth"
	| "authRequired"
	| "showFullscreenLogin"
	| "geometryLookup";

export type SupportedFeatures = {
	[key in optionalFeatures]: boolean;
} & {
	nestSource: "talon" | "fletch";
};

let supportedFeatures: SupportedFeatures = {
	koji: false,
	nestSource: "fletch",
	biomes: false,
	geocoding: false,
	auth: false,
	authRequired: false,
	showFullscreenLogin: false,
	geometryLookup: false
};

export function isSupportedFeature(feature: optionalFeatures) {
	return Boolean(supportedFeatures[feature]);
}

export function getNestSource() {
	return supportedFeatures.nestSource;
}

export async function updateSupportedFeatures() {
	const response = await fetch("/api/supported-features", { headers: getHeaders() });
	if (response.ok) supportedFeatures = await parseResponse<SupportedFeatures>(response);
}
import { getHeaders, parseResponse } from "@/lib/utils/requests";
