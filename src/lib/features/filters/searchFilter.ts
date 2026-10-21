import type { AnyFilter, FilterCategory } from "@/lib/features/filters/filters";
import type { AnyFilterset } from "@/lib/features/filters/filtersets";

export function resolveSearchFilter(
	parent: AnyFilter,
	filterset: AnyFilterset,
	subCategory?: FilterCategory
): AnyFilter {
	const focused = { ...filterset, enabled: true };
	const filter = {
		...parent,
		enabled: true,
		filters: subCategory ? [] : [focused]
	} as AnyFilter & Record<string, unknown>;
	for (const [category, child] of Object.entries(parent)) {
		if (!child || typeof child !== "object" || !("enabled" in child)) continue;
		filter[category] = {
			...child,
			enabled: category === subCategory,
			filters: category === subCategory ? [focused] : []
		};
	}
	return filter;
}
