<script lang="ts">
	import { X } from "@lucide/svelte";
	import Button, { type ButtonProps } from "@/components/ui/input/Button.svelte";

	let {
		onclick,
		class: class_ = "",
		...props
	}: {
		onclick: () => void;
		class?: string;
	} & ButtonProps = $props();
</script>

<Button variant="ghost" size="" class="rounded-sm p-2 {class_}" title="Close" {onclick} {...props}>
	<X size="20" />
</Button>
