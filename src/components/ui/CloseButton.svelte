<script lang="ts">
	import { X } from "@lucide/svelte";
	import Button, { type ButtonProps } from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";

	let {
		onclick,
		class: class_ = "",
		...props
	}: {
		onclick: () => void;
		class?: string;
	} & ButtonProps = $props();
</script>

<Button variant="ghost" size="" class="rounded-sm p-2 {class_}" title={m.close()} {onclick} {...props}>
	<X size="20" />
</Button>
