import type { UiconSet, UiconSetModifierType } from "@/lib/services/config/configTypes";
import type { FiltersetModifiers } from "@/lib/features/filters/filtersets";

export function getModifiers(iconSet: UiconSet | undefined, type: UiconSetModifierType) {
	let scale: number = 0.25;
	let offsetY: number = 0;
	let offsetX: number = 0;
	let spacing: number = 0;

	if (iconSet) {
		const modifier = iconSet[type];
		const baseModifier = iconSet.base;
		if (modifier && typeof modifier === "object") {
			scale = modifier?.scale ?? baseModifier?.scale ?? scale;
			offsetY = modifier?.offsetY ?? baseModifier?.offsetY ?? offsetY;
			offsetX = modifier?.offsetX ?? baseModifier?.offsetX ?? offsetX;
			spacing = modifier?.spacing ?? baseModifier?.spacing ?? spacing;
		}
	}

	return { scale, offsetY, offsetX, spacing };
}

export function withVisualTransform(
	baseSize: number,
	filtersetModifiers: FiltersetModifiers | undefined
) {
	let imageSize = baseSize;
	let imageRotation: number | undefined = undefined;

	if (filtersetModifiers?.scale && filtersetModifiers.scale !== 1) {
		imageSize *= filtersetModifiers.scale;
	}

	if (filtersetModifiers?.rotation && filtersetModifiers.rotation !== 0) {
		imageRotation = filtersetModifiers.rotation;
	}

	return { imageSize, imageRotation };
}
