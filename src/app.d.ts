import type { AvailableLanguageTag } from "../../lib/paraglide/runtime"
import type { ParaglideLocals } from "@inlang/paraglide-sveltekit"
// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		 interface Locals {
    paraglide: ParaglideLocals<AvailableLanguageTag>,
}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
