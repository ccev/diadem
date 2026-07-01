<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { setActiveSearchQuest } from "$lib/features/activeSearch.svelte";
	import { Search } from "@lucide/svelte";
	import { resetPopupBaseDrawerSnapPoint } from "@/components/ui/popups2/common/PopupBaseDrawer.svelte";

	let {
		label,
		onclick
	}: {
		label: string,
		onclick: () => void
	} = $props();
</script>

<Button
	variant="link"
	class="w-full mt-3 mb-2"
	onclick={() => {
		resetPopupBaseDrawerSnapPoint()
		onclick()
	}}
>
	<Search class="size-3.5" />
	{label}
</Button>
