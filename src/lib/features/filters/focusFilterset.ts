import type { AnyFilter, FilterCategory } from "@/lib/features/filters/filters";
import type { AnyFilterset } from "@/lib/features/filters/filtersets";

/** Build a temporary filter without changing saved enabled flags or sibling categories. */
export function focusFilterset(
	parent: AnyFilter,
	filterset: AnyFilterset,
	subCategory?: FilterCategory
): AnyFilter {
	const filter = structuredClone(parent);
	filter.enabled = true;
	const focused = { ...structuredClone(filterset), enabled: true };
	if (subCategory) {
		for (const [category, child] of Object.entries(filter)) {
			if (child && typeof child === "object" && "enabled" in child) {
				child.enabled = category === subCategory;
				child.filters = category === subCategory ? [focused] : [];
			}
		}
	} else if ("filters" in filter) {
		filter.filters = [focused] as typeof filter.filters;
	}
	return filter;
}
