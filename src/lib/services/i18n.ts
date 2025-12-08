import { createI18n } from "@inlang/paraglide-sveltekit"
import * as runtime from "@/lib/paraglide/runtime.js"
import { availableLanguageTags } from '@/lib/paraglide/runtime.js';
import { getConfig } from '@/lib/services/config/config';
import { browser } from "$app/environment";

export const i18n = createI18n(runtime, { exclude: [/.*/] })

export function resolveLanguageTag(userSettingsLanguageTag: string) {
	if (userSettingsLanguageTag === "auto") {
		let browserTag: string | undefined
		if (browser) browserTag = window.navigator.language.toLowerCase().split("-")[0]
		return availableLanguageTags.find(l => l === browserTag) ?? getConfig().general.defaultLocale ?? "en"
	}

	return userSettingsLanguageTag
}