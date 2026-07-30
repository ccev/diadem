<script lang="ts">
	import ProfileCard from "@/components/ui/user/ProfileCard.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import SectionAppearance from "@/components/menus/profile/SectionAppearance.svelte";
	import SectionIcons from "@/components/menus/profile/SectionIcons.svelte";
	import SectionAdvanced from "@/components/menus/profile/SectionAdvanced.svelte";
	import SectionInstance from "@/components/menus/profile/SectionInstance.svelte";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { isInstanceUrlBaked, isNative } from "@/lib/native/runtime";
	import SectionAccounts from "@/components/menus/profile/SectionAccounts.svelte";
</script>

<div class="space-y-2">
	<SignInButton />

	{#if isSupportedFeature("auth")}
		<ProfileCard />
	{/if}

	{#if isSupportedFeature("auth") && isSupportedFeature("autoBattle")}
		<SectionAccounts />
	{/if}

	<SectionAppearance />
	<SectionIcons />
	<SectionAdvanced />
	{#if isNative() && !isInstanceUrlBaked()}
		<SectionInstance />
	{/if}
</div>
