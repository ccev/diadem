import type { Perms } from "@/lib/utils/features";
import type { BetterAuthSessionData } from "@/lib/server/auth/betterAuth";
import type { User } from "@/lib/server/db/internal/schema";
import type { OverlayEntry } from "@/lib/ui/overlays.svelte";

declare global {
	namespace App {
		interface PageState {
			overlays?: OverlayEntry[];
		}

		interface Locals {
			user: User | null;
			session: BetterAuthSessionData | null;
			perms: Perms;
		}
	}
}

export {};
