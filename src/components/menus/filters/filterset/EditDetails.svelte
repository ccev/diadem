<script lang="ts">
	import type { AnyFilterset } from '@/lib/features/filters/filtersets';
	import Input from '@/components/ui/input/Input.svelte';
	import TextInput from '@/components/ui/input/TextInput.svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import MenuTitle from '@/components/menus/MenuTitle.svelte';
	import { filterTitle } from '@/lib/features/filters/filtersetUtils';
	import FiltersetIcon from '@/lib/features/filters/FiltersetIcon.svelte';

	let {
		data
	}: {
		data: AnyFilterset
	} = $props()
</script>

<MenuTitle title="Icon" />
<div class="flex justify-center">
	<div>

		<Button
			class="rounded-full! size-20! text-4xl! bg-muted ring-border ring-2 ring-offset-4"
			variant="ghost"
		>
			<FiltersetIcon filterset={$state.snapshot(data)} size={10} />
		</Button>
	</div>
</div>

<TextInput
	class="z-50 relative"
	title="Name"
	value={filterTitle($state.snapshot(data))}
	onchange={e => {
		data.title.title = e.target?.value ?? ""
	}}
/>