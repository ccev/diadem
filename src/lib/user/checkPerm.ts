import type { FeaturesKey, Perms } from "@/lib/server/auth/permissions";

export const noPermResult = {
	error: "Missing permissions",
	result: []
};

function isFeatureInFeatureList(featureList: FeaturesKey[], feature: FeaturesKey) {
	return featureList.includes("*") || featureList.includes(feature)
}

export function hasFeatureAnywhere(perms: Perms, feature: FeaturesKey) {
	if (isFeatureInFeatureList(perms.everywhere, feature)) return true;

	for (const area of perms.areas) {
		if (isFeatureInFeatureList(area.features, feature)) {
			return true
		}
	}
	return false
}
