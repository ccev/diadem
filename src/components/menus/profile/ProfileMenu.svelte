<script lang="ts">
	import ProfileCard from '@/components/ui/user/ProfileCard.svelte';
	import { isSupportedFeature } from '@/lib/services/supportedFeatures';
	import SectionAppearance from '@/components/menus/profile/SectionAppearance.svelte';
	import SectionIcons from '@/components/menus/profile/SectionIcons.svelte';
	import SectionAdvanced from '@/components/menus/profile/SectionAdvanced.svelte';
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
</script>

<div class="space-y-2">
	<SignInButton />

	{#if isSupportedFeature("auth")}
		<ProfileCard />
	{/if}

	<SectionAppearance />
	<SectionIcons />
	<SectionAdvanced />
</div>
