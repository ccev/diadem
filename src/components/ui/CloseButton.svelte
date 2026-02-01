<script lang="ts">
	import { X } from 'lucide-svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import { closePopup } from '@/lib/mapObjects/interact';

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
	<X size="20" />
</Button>