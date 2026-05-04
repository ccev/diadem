<script lang="ts">
	import { X } from "lucide-svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";

	let {
		onclick,
		class: class_ = ""
	}: {
		onclick: () => void;
		class?: string;
	} = $props();
</script>

<Button variant="ghost" size="" class="rounded-sm p-2 {class_}" title={m.close()} {onclick}>
	<X size="20" />
</Button>
