<script lang="ts">
	import * as icons from "@lucide/svelte";
	import type { Component } from "svelte";
	import type { IconProps } from "@lucide/svelte";

	let { name, ...rest }: { name: keyof typeof icons } & IconProps = $props();

	const Icon = $derived(icons[name] as unknown as Component<any>);
</script>

<Icon {...rest} />
