<script lang="ts">
	import BottomNav from '@/components/ui/nav/BottomNav.svelte';
	import { getUserSettings } from '@/lib/userSettings.svelte';
</script>

<div
	class="fixed z-10 bottom-2 w-full flex flex-col pointer-events-none items-start"
	class:items-end={!getUserSettings().isLeftHanded}
>
<BottomNav page="/" />
</div>