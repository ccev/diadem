<script lang="ts">
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import BottomNavWrapper from '@/components/ui/nav/BottomNavWrapper.svelte';
	import BottomNavSpacing from '@/components/ui/nav/BottomNavSpacing.svelte';
	import Button from '@/components/ui/Button.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
</script>

<div class="mt-2 mx-2">
	<Button
		tag="button"
		onclick={() => {getUserSettings().isLeftHanded = !getUserSettings().isLeftHanded}}
	>
		Toggle left handed
	</Button>
</div>


<BottomNavSpacing />
<BottomNavWrapper page="/settings" />

