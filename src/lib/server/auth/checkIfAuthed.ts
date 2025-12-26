import type { User } from "@/lib/server/db/internal/schema";
import { isAuthRequired } from "@/lib/services/config/config.server";
import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";

import type { FeaturesKey, Perms } from "@/lib/utils/features";

export function checkIfAuthed(user: User | null) {
	return !isAuthRequired() || user;
}

export function hasFeatureAnywhereServer(perms: Perms, feature: FeaturesKey, user: User | null) {
	return checkIfAuthed(user) && hasFeatureAnywhere(perms, feature)
}