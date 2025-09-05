<script lang="ts">
	import ProfileCard from '@/components/ui/user/ProfileCard.svelte';
	import { isSupportedFeature } from '@/lib/services/supportedFeatures';
	import SectionAppearance from '@/components/menus/profile/SectionAppearance.svelte';
	import SectionIcons from '@/components/menus/profile/SectionIcons.svelte';
	import SectionAdvanced from '@/components/menus/profile/SectionAdvanced.svelte';
</script>

<div class="space-y-2 mt-2" style="container-name: menu-container; container-type: inline-size">
	{#if isSupportedFeature("auth")}
		<ProfileCard />
	{/if}

	<SectionAppearance />
	<SectionIcons />
	<SectionAdvanced />
</div>
