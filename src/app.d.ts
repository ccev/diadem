import type { AvailableLanguageTag } from '../../lib/paraglide/runtime';
import type { ParaglideLocals } from '@inlang/paraglide-sveltekit';

import type { Perms } from "@/lib/utils/features";
import type { BetterAuthSessionData, BetterAuthUserData } from "@/lib/server/auth/betterAuth";
import type { User } from "@/lib/server/db/internal/schema";

declare global {
	namespace App {
		interface Locals {
			paraglide: ParaglideLocals<AvailableLanguageTag>;
			user: User | null;
			session: BetterAuthSessionData | null;
			authUser: BetterAuthUserData | null;
			perms: Perms;
		}
	}
}

export {};
