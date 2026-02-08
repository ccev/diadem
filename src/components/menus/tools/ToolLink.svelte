<script lang="ts">
	import { getDefaultMapStyle } from "@/lib/services/themeMode";
	import { MapObjectLayerId } from "@/lib/map/layers";
	import { FillLayer, GeoJSON, MapLibre } from "svelte-maplibre";
	import { Map } from "lucide-svelte";
	import Card from "@/components/ui/Card.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as turf from "@turf/turf";
	import type { LucideIcon } from "@/lib/types/lucide";
	import type { Snippet } from "svelte";
	import { isMenuSidebar } from "@/lib/utils/device";

	let {
		Icon,
		title,
		description,
		onclick,
		children
	}: {
		Icon: LucideIcon
		title: string
		description: string
		onclick: () => void
		children: Snippet
	} = $props()

	let toolsClass: string = $derived(isMenuSidebar() ? "tools-sidebar": "tools-mobile")
</script>

<Button
	class="{toolsClass} rounded-lg flex-col! w-full! items-start! gap-0! font-normal! border bg-card text-card-foreground shadow-md px-4 relative overflow-hidden group"
	variant=""
	size=""
	{onclick}
>
	<div
		class="inset-0 absolute size-full z-10 transition-colors group-hover:bg-accent/30 group-active:bg-accent/30"
		aria-hidden="true"
	></div>

	{@render children()}

	<div class="absolute top-0 right-0 bg-linear-to-r from-background to-background/50 w-1/2 h-full">

	</div>
	<div class="flex gap-4 items-center group relative z-20">
		<Card class="tools-icon bg-card text-muted-foreground flex items-center justify-center aspect-square">
			<Icon class="tools-icon-icon" />
		</Card>
		<div>
			<div class="flex items-center gap-2 w-full font-semibold">

				<span>{title}</span>
			</div>
			<p class="text-muted-foreground">
				{description}
			</p>
		</div>
	</div>

</Button>

<style>
	:global(.tools-sidebar) {
        font-size: var(--text-base)!important;
        line-height: var(--tw-leading, var(--text-lg--line-height)) !important;
        padding-block: calc(var(--spacing) * 4);

		& .tools-icon {
            width: calc(var(--spacing) * 10);
            height: calc(var(--spacing) * 10);
		}

        & .tools-icon-icon {
            width: calc(var(--spacing) * 4);
            height: calc(var(--spacing) * 4);
        }
	}

	:global(.tools-mobile) {
        font-size: var(--text-lg)!important;
        line-height: var(--tw-leading, var(--text-lg--line-height)) !important;
        padding-block: calc(var(--spacing) * 5);

        & .tools-icon {
            width: calc(var(--spacing) * 12);
            height: calc(var(--spacing) * 12);
        }

        & .tools-icon-icon {
            width: calc(var(--spacing) * 5);
            height: calc(var(--spacing) * 5);
        }
	}
</style>