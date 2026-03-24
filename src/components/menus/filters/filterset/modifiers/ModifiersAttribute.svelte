<script lang="ts">
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";
	import Switch from "@/components/ui/input/Switch.svelte";
	import SliderSteps from "@/components/ui/input/slider/SliderSteps.svelte";
	import Card from "@/components/ui/Card.svelte";
	import Input from "@/components/ui/input/Input.svelte";
	import * as m from "@/lib/paraglide/messages";
	import ColorSwatches from "@/components/menus/filters/filterset/modifiers/ColorSwatches.svelte";
	import ModifierPreview from "@/components/menus/filters/filterset/modifiers/ModifierPreview.svelte";
	import RadioGroup from "@/components/ui/input/selectgroup/RadioGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import {
		DEFAULT_BACKGROUND_COLOR,
		DEFAULT_GLOW_COLOR,
		MODIFIER_BACKGROUND_OPACITY,
		MODIFIER_GLOW_OPACITY,
		MODIFIER_GLOW_RADIUS
	} from "@/lib/features/filters/modifierPresets";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";

	let {
		data,
		iconUrl = undefined
	}: {
		data: AnyFilterset;
		iconUrl?: string;
	} = $props();

	type VisualMode = "none" | "glow" | "background";

	let visualMode = $derived<VisualMode>(
		data.modifiers?.glow ? "glow" : data.modifiers?.background ? "background" : "none"
	);

	let activeColor = $derived(
		data.modifiers?.glow?.color ?? data.modifiers?.background?.color ?? DEFAULT_GLOW_COLOR
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

	function getDefaultGlow(color?: string) {
		return {
			color: color ?? DEFAULT_GLOW_COLOR,
			radius: MODIFIER_GLOW_RADIUS,
			opacity: MODIFIER_GLOW_OPACITY
		};
	}

	function getDefaultBackground(color?: string) {
		return {
			color: color ?? DEFAULT_BACKGROUND_COLOR,
			opacity: MODIFIER_BACKGROUND_OPACITY
		};
	}

	function onVisualModeChange(mode: VisualMode) {
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
			data.modifiers!.glow = getDefaultGlow(currentColor);
		} else {
			data.modifiers!.background = getDefaultBackground(currentColor);
		}
	}

	function onColorChange(color: string) {
		if (data.modifiers?.glow) {
			data.modifiers.glow = { ...data.modifiers.glow, color };
		} else if (data.modifiers?.background) {
			data.modifiers.background = { ...data.modifiers.background, color };
		}
	}

	function setGlowIntensity(value: number) {
		if (data.modifiers?.glow) {
			data.modifiers.glow = {
				...data.modifiers.glow,
				opacity: value
			};
		}
	}

	function setBackgroundOpacity(value: number) {
		if (data.modifiers?.background) {
			data.modifiers.background = {
				...data.modifiers.background,
				opacity: value
			};
		}
	}

	function toggleBadge(enabled: boolean) {
		if (enabled) {
			ensureModifiers();
			data.modifiers!.showBadge = true;
		} else if (data.modifiers) {
			delete data.modifiers.showBadge;
			cleanupModifiers();
		}
	}

	function toggleLabel(enabled: boolean) {
		if (enabled) {
			ensureModifiers();
			data.modifiers!.showLabel = filterTitle(data);
		} else if (data.modifiers) {
			delete data.modifiers.showLabel;
			cleanupModifiers();
		}
	}

	function setScale(value: number) {
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
	}

	function setRotation(value: number) {
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
	}
</script>

<div class="space-y-3 pb-2">
	<div class="sticky top-0 z-10">
		<ModifierPreview modifiers={data.modifiers} {iconUrl} filterset={data} />
	</div>

	<Card class="p-3 space-y-3">
		<div class="flex items-center justify-between gap-2">
			<MenuTitle title={m.modifier_show_badge()} />
			<Switch
				checked={data.modifiers?.showBadge ?? false}
				onCheckedChange={toggleBadge}
			/>
		</div>
		<div class="flex items-center justify-between gap-2">
			<MenuTitle title={m.modifier_show_label()} />
			<Switch
				checked={!!data.modifiers?.showLabel}
				onCheckedChange={toggleLabel}
			/>
		</div>
		{#if data.modifiers?.showLabel}
			<Input
				class="w-full"
				value={data.modifiers.showLabel}
				onchange={(e) => {
					if (data.modifiers) {
						const value = e.target?.value?.trim();
						if (value) {
							data.modifiers.showLabel = value;
						} else {
							data.modifiers.showLabel = filterTitle(data);
						}
					}
				}}
			/>
		{/if}
	</Card>

	<Card class="p-3 space-y-3">
		<MenuTitle title={m.modifier_visual()} />
		<RadioGroup
			value={visualMode}
			onValueChange={(value) => onVisualModeChange(value as VisualMode)}
			class="self-center"
		>
			<SelectGroupItem class="p-2 w-full" value="none">
				{m.modifier_none()}
			</SelectGroupItem>
			<SelectGroupItem class="p-2 w-full" value="glow">
				{m.modifier_glow()}
			</SelectGroupItem>
			<SelectGroupItem class="p-2 w-full" value="background">
				{m.modifier_background()}
			</SelectGroupItem>
		</RadioGroup>
		{#if visualMode !== "none"}
			<div class="space-y-2 pt-3">
				<ColorSwatches selected={activeColor} onchange={onColorChange} />
				{#if data.modifiers?.glow}
					<MenuTitle title={m.modifier_glow_intensity()} />
					<SliderSteps
						value={data.modifiers.glow.opacity ?? MODIFIER_GLOW_OPACITY}
						onchange={setGlowIntensity}
						steps={[0.25, 0.5, 0.75, 1]}
						labels={{
							0.25: "25%",
							0.5: "50%",
							0.75: "75%",
							1: "100%"
						}}
					/>
				{/if}
				{#if data.modifiers?.background}
					<MenuTitle title={m.modifier_background_intensity()} />
					<SliderSteps
						value={data.modifiers.background.opacity ?? MODIFIER_BACKGROUND_OPACITY}
						onchange={setBackgroundOpacity}
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
	</Card>

	<Card class="p-3 space-y-3">
		<MenuTitle title={m.modifier_scale()} />
		<SliderSteps
			value={data.modifiers?.scale ?? 1}
			onchange={setScale}
			steps={[0.75, 1, 1.25, 1.5]}
			labels={{
				0.75: "S",
				1: "M",
				1.25: "L",
				1.5: "XL"
			}}
		/>
		<MenuTitle title={m.modifier_rotation()} />
		<SliderSteps
			value={data.modifiers?.rotation ?? 0}
			onchange={setRotation}
			steps={[0, 90, 180, 270]}
			labels={{
				0: "0°",
				90: "90°",
				180: "180°",
				270: "270°"
			}}
		/>
	</Card>
</div>
