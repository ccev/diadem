<script lang="ts">
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import BottomNavWrapper from '@/components/ui/nav/BottomNavWrapper.svelte';
	import BottomNavSpacing from '@/components/ui/nav/BottomNavSpacing.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { getUserSettings, updateUserSettings } from '@/lib/userSettings.svelte';
	import Card from '@/components/ui/Card.svelte';
	import {Paintbrush} from 'lucide-svelte';
	import Switch from '@/components/ui/settings/Switch.svelte';
	import SelectGroup from '@/components/ui/settings/SelectGroup.svelte';
	import SelectGroupItem from '@/components/ui/settings/SelectGroupItem.svelte';

	$effect(() => {
		getUserSettings()
		updateUserSettings()
	})
</script>

<div class="mt-2 mx-auto max-w-[30rem]">
	<Card class="px-6 pt-4 pb-2 mx-2">
		<h1 class="font-bold text-lg tracking-tight flex items-center gap-2 mb-2">
			<Paintbrush size="18"/>
			Appearance
		</h1>
		<div class="py-3 w-full flex justify-between items-center">
			<div>
				<p class="font-semibold">
					Left-handed mode
				</p>
				<p class="text-sm">
					Place UI elements on the left
				</p>
			</div>

			<Switch
				checked={getUserSettings().isLeftHanded}
				onclick={() => {getUserSettings().isLeftHanded = !getUserSettings().isLeftHanded}}
			/>

<!--			<Button-->
<!--				tag="button"-->
<!--				onclick={() => {getUserSettings().isLeftHanded = !getUserSettings().isLeftHanded}}-->
<!--			>-->
<!--				Click-->
<!--			</Button>-->
		</div>
		<div class="py-3 w-full flex flex-col gap-1">
			<div>
				<p class="font-semibold">
					Dark Mode
				</p>
			</div>

<!--			<SelectGroup>-->
<!--				<SelectGroupItem value="test" label="test" />-->
<!--				<SelectGroupItem value="test2" />-->
<!--			</SelectGroup>-->

			<Button
				tag="button"
				onclick={() => {getUserSettings().isDarkMode = !getUserSettings().isDarkMode}}
			>
				Click
			</Button>
		</div>
	</Card>


<!--	<Button-->
<!--		tag="button"-->
<!--		onclick={() => {getUserSettings().isDarkMode = !getUserSettings().isDarkMode}}-->
<!--	>-->
<!--		Toggle dark mode-->
<!--	</Button>-->
</div>


<BottomNavSpacing />
<BottomNavWrapper page="/settings" />

