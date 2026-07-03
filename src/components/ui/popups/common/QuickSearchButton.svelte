<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { setActiveSearchQuest } from "$lib/features/activeSearch.svelte";
	import { Search } from "@lucide/svelte";
	import { resetPopupBaseDrawerSnapPoint } from "@/components/ui/popups/common/PopupBaseDrawer.svelte";

	let {
		label,
		onclick,
		class: class_ = ""
	}: {
		label: string,
		onclick: () => void,
		class?: string
	} = $props();
</script>

<Button
	variant="link"
	class="w-full mt-3 mb-2 {class_}"
	onclick={() => {
		resetPopupBaseDrawerSnapPoint()
		onclick()
	}}
>
	<Search class="size-3.5" />
	{label}
</Button>
