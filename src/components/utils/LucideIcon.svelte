<script lang="ts">
	import * as icons from 'lucide-svelte';
	import type { IconProps } from "lucide-svelte";

	let { name, ...rest }: { name: keyof typeof icons } & IconProps = $props();

	const Icon = $derived(icons[name]);
</script>

<Icon {...rest} />