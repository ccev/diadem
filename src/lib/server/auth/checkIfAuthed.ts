import type { User } from "@/lib/server/db/internal/schema";
import { isAuthRequired } from "@/lib/server/auth/betterAuth";
import { hasAnySubFeatureAnywhere, hasFeatureAnywhere } from "@/lib/services/user/checkPerm";

import type { FeaturesKey, Perms } from "@/lib/utils/features";
import type { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

export function checkIfAuthed(user: User | null) {
	return Boolean(!isAuthRequired() || user);
}

export function hasFeatureAnywhereServer(perms: Perms, feature: FeaturesKey, user: User | null) {
	return checkIfAuthed(user) && hasFeatureAnywhere(perms, feature);
}

export function hasAnySubFeatureAnywhereServer(
	perms: Perms,
	type: MapObjectType,
	user: User | null
) {
	return checkIfAuthed(user) && hasAnySubFeatureAnywhere(perms, type);
}
