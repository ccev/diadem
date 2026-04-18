<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { Search, X } from "lucide-svelte";
	import Input from "@/components/ui/input/Input.svelte";

	let {
		class: class_ = "",
		query = $bindable(),
		placeholder
	}: {
		class?: string;
		query: string;
		placeholder: string;
	} = $props();
</script>

<div class="relative w-full {class_}">
	<Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
	<Input
		type="search"
		{placeholder}
		value={query}
		oninput={(e) => {
			query = (e.target as HTMLInputElement).value;
		}}
		class="pl-9 w-full"
	/>
	{#if query}
		<Button
			variant="ghost"
			class="absolute right-1 top-1/2 -translate-y-1/2 w-fit h-fit size-8! p-0!"
			onclick={() => {
				query = "";
			}}
		>
			<X class="size-4" />
		</Button>
	{/if}
</div>
