<script lang="ts">
	import { RadioGroup } from 'bits-ui';
	import RadioGroupItem from '@/components/ui/basic/RadioGroupItem.svelte';
	import type { Snippet } from 'svelte';

	let {
		children = undefined,
		class: class_ = '',
		...rest
	}: {
		children?: Snippet,
		class?: string,
	} & RadioGroup.ItemProps = $props();
</script>

<RadioGroupItem class="flex-col rounded-lg! w-20! gap-1! {class_}" {...rest}>
	{@render children?.()}
</RadioGroupItem>