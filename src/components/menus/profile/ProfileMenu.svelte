<script lang="ts">
	import ProfileCard from "@/components/ui/user/ProfileCard.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import SectionAppearance from "@/components/menus/profile/SectionAppearance.svelte";
	import SectionIcons from "@/components/menus/profile/SectionIcons.svelte";
	import SectionAdvanced from "@/components/menus/profile/SectionAdvanced.svelte";
	import SectionInstance from "@/components/menus/profile/SectionInstance.svelte";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { hasHardcodedInstance, isNative } from "@/lib/native/runtime";
</script>

<div class="space-y-2">
	<SignInButton />

	{#if isSupportedFeature("auth")}
		<ProfileCard />
	{/if}

	<SectionAppearance />
	<SectionIcons />
	<SectionAdvanced />
	{#if isNative() && !hasHardcodedInstance()}
		<SectionInstance />
	{/if}
</div>
