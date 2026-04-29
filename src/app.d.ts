import type { AvailableLanguageTag } from "../../lib/paraglide/runtime";
import type { ParaglideLocals } from "@inlang/paraglide-sveltekit";

import type { Perms } from "@/lib/utils/features";

export type LocalsUser = {
	id: string;
	discordId: string;
	permissions: Perms;
	discordToken?: string;
	username?: string;
	displayName?: string;
	avatarUrl?: string;
	roles?: string[];
	roleIds?: string[];
} | null;

declare global {
	namespace App {
		interface Locals {
			paraglide: ParaglideLocals<AvailableLanguageTag>;
			user: LocalsUser;
			session: import("$lib/server/auth").SessionValidationResult["session"];
			perms: Perms;
			authSource: "header" | "cookie" | null;
		}
	}
}
