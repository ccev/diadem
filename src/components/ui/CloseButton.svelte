<script lang="ts">
	import { closePopup } from '@/lib/mapObjects/mapObjects.svelte.js';
	import { X } from 'lucide-svelte';
	import Button from '@/components/ui/Button.svelte';

	let {
		onclick,
		class: class_ = ""
	}: {
		onclick: () => void,
		class?: string
	} = $props()
</script>

<Button
	variant="ghost"
	size=""
	class="rounded-sm p-2 {class_}"
	{onclick}
>
	<X />
</Button>