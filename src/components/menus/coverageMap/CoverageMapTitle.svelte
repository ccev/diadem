<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import { closeMenu } from "@/lib/ui/menus.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { closeCoverageMap, getClickedCoverageMapAreas } from "@/lib/features/coverageMap.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowLeft } from "lucide-svelte";
	import { slide, fade, fly } from "svelte/transition";
	import Card from "@/components/ui/Card.svelte";
	import {flip} from "svelte/animate";
</script>

<div
	class="fixed top-2 z-20 w-full px-2"
	transition:fly={{ duration: 90, y: -14 }}
>
	<div class="w-full pl-4 pr-2 py-2 flex items-center justify-between bg-card rounded-lg border border-border">
		<h1 class="font-semibold">
			{m.nav_coveragemap()}
		</h1>
		<Button
			size="sm"
			variant="outline"
			onclick={closeCoverageMap}
		>
			<ArrowLeft class="size-4" />
			<span>{m.back_to_map()}</span>
		</Button>
	</div>
</div>
