<script lang="ts">
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import TextInput from "@/components/ui/input/TextInput.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import MenuTitle from "@/components/menus/MenuTitle.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import {
		filtersetPageEditAttribute,
		setCurrentAttributePage
	} from "@/lib/features/filters/filtersetPages.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { Pencil } from "lucide-svelte";
	import IconPicker from "@/components/menus/filters/filterset/iconpicker/IconPicker.svelte";

	let {
		data
	}: {
		data: AnyFilterset;
	} = $props();

	function openIconPicker() {
		filtersetPageEditAttribute();
		setCurrentAttributePage(iconPickerPage, m.details());
	}
</script>

{#snippet iconPickerPage(thisData)}
	<IconPicker data={thisData} />
{/snippet}

<div>
	<MenuTitle title={m.filter_icon()} />
	<div class="flex justify-center">
		<div class="relative">
			<button
				onclick={openIconPicker}
				class="absolute -right-3 -top-2 rounded-full bg-background text-muted-foreground p-2 border-border border-2 cursor-pointer"
			>
				<Pencil class="size-4" />
			</button>
			<Button
				class="rounded-full! size-20! text-4xl! bg-muted ring-border ring-2 ring-offset-4"
				variant="ghost"
				onclick={openIconPicker}
			>
				<FiltersetIcon filterset={$state.snapshot(data)} size={10} />
			</Button>
		</div>
	</div>

	<TextInput
		class="z-50 relative"
		title={m.filter_name()}
		value={filterTitle($state.snapshot(data))}
		onchange={(e) => {
			data.title.title = e.target?.value ?? "";
		}}
	/>
</div>
