<script lang="ts">
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";
	import Switch from "@/components/ui/input/Switch.svelte";
	import SliderSteps from "@/components/ui/input/slider/SliderSteps.svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import * as m from "@/lib/paraglide/messages";
	import ColorSwatches from "@/components/menus/filters/filterset/modifiers/ColorSwatches.svelte";
	import ModifierPreview from "@/components/menus/filters/filterset/modifiers/ModifierPreview.svelte";
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import {
		MODIFIER_BACKGROUND_OPACITY, MODIFIER_COLORS,
		MODIFIER_GLOW_OPACITY
	} from "@/lib/features/filters/modifierPresets";
	import type { FilterCategory } from "@/lib/features/filters/filters";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import { slide } from "svelte/transition";
	import { formatPercentage } from "@/lib/utils/numberFormat";

	let {
		data,
		majorCategory = undefined,
		subCategory = undefined
	}: {
		data: AnyFilterset;
		majorCategory?: FilterCategory;
		subCategory?: FilterCategory;
	} = $props();

	type VisualMode = "none" | "glow" | "background";

	const defaultColor = MODIFIER_COLORS.red

	let visualMode = $derived<VisualMode>(
		data.modifiers?.glow ? "glow" : data.modifiers?.background ? "background" : "none"
	);

	let activeColor = $derived(
		data.modifiers?.glow?.color ?? data.modifiers?.background?.color ?? defaultColor,
	);

	function ensureModifiers() {
		if (!data.modifiers) data.modifiers = {};
	}

	function cleanupModifiers() {
		if (
			data.modifiers &&
			!data.modifiers.glow &&
			!data.modifiers.background &&
			!data.modifiers.scale &&
			!data.modifiers.rotation &&
			!data.modifiers.showBadge &&
			!data.modifiers.showLabel
		) {
			delete data.modifiers;
		}
	}
</script>

<div class="sticky top-0 pt-1 z-10">
	<ModifierPreview filterset={data} {majorCategory} {subCategory} />
</div>

<div class="divide-y divide-border *:py-6 *:px-1">
	<div>
		<div class="flex items-center justify-between gap-2">
			<MenuTitle title={m.modifier_show_badge()} />
			<Switch
				checked={data.modifiers?.showBadge ?? false}
				onCheckedChange={(enabled) => {
					if (enabled) {
						ensureModifiers();
						data.modifiers!.showBadge = true;
					} else if (data.modifiers) {
						delete data.modifiers.showBadge;
						cleanupModifiers();
					}
				}}
			/>
		</div>
		<div class="flex items-center justify-between gap-2 mt-4">
			<MenuTitle title={m.modifier_show_label()} />
			<Switch
				checked={!!data.modifiers?.showLabel}
				onCheckedChange={(enabled) => {
					if (enabled) {
						ensureModifiers();
						data.modifiers!.showLabel = filterTitle(data);
					} else if (data.modifiers) {
						delete data.modifiers.showLabel;
						cleanupModifiers();
					}
				}}
			/>
		</div>
		{#if data.modifiers?.showLabel}
			<div class="mt-2" transition:slide={{ duration: 70 }}>
				<Input
					class="w-full"
					value={data.modifiers.showLabel}
					onchange={(e) => {
						if (data.modifiers) {
							const value = e.target?.value?.trim();
							if (value) {
								data.modifiers.showLabel = value;
							} else {
								data.modifiers.showLabel = true;
							}
						}
					}}
				/>
			</div>
		{/if}
	</div>

	<div>
		<MenuTitle title={m.modifier_background()} />
		<RadioGroup
			value={visualMode}
			onValueChange={(mode) => {
				const currentColor = activeColor;
				if (data.modifiers) {
					delete data.modifiers.glow;
					delete data.modifiers.background;
				}
				if (mode === "none") {
					cleanupModifiers();
					return;
				}
				ensureModifiers();
				if (mode === "glow") {
					data.modifiers!.glow = {
						color: currentColor ?? defaultColor,
						opacity: MODIFIER_GLOW_OPACITY
					};
				} else {
					data.modifiers!.background = {
						color: currentColor ?? defaultColor,
						opacity: MODIFIER_BACKGROUND_OPACITY
					};
				}
			}}
			class="w-full mt-3"
		>
			<SelectGroupItem class="p-2 w-full" value="none">
				{m.modifier_none()}
			</SelectGroupItem>
			<SelectGroupItem class="p-2 w-full" value="glow">
				{m.modifier_glow()}
			</SelectGroupItem>
			<SelectGroupItem class="p-2 w-full" value="background"
				>{m.modifier_background_circle()}</SelectGroupItem
			>
		</RadioGroup>
		{#if visualMode !== "none"}
			<div class="pt-3 space-y-2" transition:slide={{ duration: 70 }}>
				<ColorSwatches
					selected={activeColor}
					onchange={(color) => {
						if (data.modifiers?.glow) {
							data.modifiers.glow = { ...data.modifiers.glow, color };
						} else if (data.modifiers?.background) {
							data.modifiers.background = { ...data.modifiers.background, color };
						}
					}}
				/>
				{#if data.modifiers?.glow}
					<MenuTitle title={m.modifier_glow_intensity()} />
					<SliderSteps
						value={data.modifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY}
						onchange={(value) => {
							if (data.modifiers?.glow) {
								data.modifiers.glow = { ...data.modifiers.glow, opacity: value };
							}
						}}
						steps={[0.25, 0.5, 0.75, 1]}
						labels={{
							0.25: formatPercentage(0.25, { maxDecimals: 0, minDecimals: 0 }),
							0.5: formatPercentage(0.5, { maxDecimals: 0, minDecimals: 0 }),
							0.75: formatPercentage(0.75, { maxDecimals: 0, minDecimals: 0 }),
							1: formatPercentage(1, { maxDecimals: 0, minDecimals: 0 })
						}}
					/>
				{/if}
				{#if data.modifiers?.background}
					<MenuTitle title={m.modifier_background_intensity()} />
					<SliderSteps
						value={data.modifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY}
						onchange={(value) => {
							if (data.modifiers?.background) {
								data.modifiers.background = { ...data.modifiers.background, opacity: value };
							}
						}}
						steps={[0.25, 0.5, 0.75, 1]}
						labels={{
							0.25: "25%",
							0.5: "50%",
							0.75: "75%",
							1: "100%"
						}}
					/>
				{/if}
			</div>
		{/if}
	</div>

	<div>
		<MenuTitle class="mb-2" title={m.modifier_scale()} />
		<SliderSteps
			value={data.modifiers?.scale ?? 1}
			onchange={(value) => {
				const rounded = Number(value.toFixed(2));
				if (rounded === 1) {
					if (data.modifiers) {
						delete data.modifiers.scale;
						cleanupModifiers();
					}
					return;
				}
				ensureModifiers();
				data.modifiers!.scale = rounded;
			}}
			steps={[0.7, 1, 1.3, 1.6]}
			labels={{
				0.7: "S",
				1: "M",
				1.3: "L",
				1.6: "XL"
			}}
		/>
		<MenuTitle class="mt-4 mb-2" title={m.modifier_rotation()} />
		<SliderSteps
			value={data.modifiers?.rotation ?? 0}
			onchange={(value) => {
				const rounded = Math.round(value);
				if (rounded === 0) {
					if (data.modifiers) {
						delete data.modifiers.rotation;
						cleanupModifiers();
					}
					return;
				}
				ensureModifiers();
				data.modifiers!.rotation = rounded;
			}}
			steps={[0, 90, 180, 270]}
			labels={{
				0: "0°",
				90: "90°",
				180: "180°",
				270: "270°"
			}}
		/>
	</div>
</div>
