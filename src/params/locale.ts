import { isLocale } from "@/lib/i18n/locales";
import type { ParamMatcher } from "@sveltejs/kit";

export const match: ParamMatcher = isLocale;
