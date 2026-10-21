<script lang="ts">
	import ProfileCard from "@/components/ui/user/ProfileCard.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import SectionAppearance from "@/components/menus/profile/SectionAppearance.svelte";
	import SectionIcons from "@/components/menus/profile/SectionIcons.svelte";
	import SectionAdvanced from "@/components/menus/profile/SectionAdvanced.svelte";
	import SectionInstance from "@/components/menus/profile/SectionInstance.svelte";
	import SectionTrainers from "@/components/menus/profile/SectionTrainers.svelte";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { Features } from "@/lib/utils/features";
	import SignInButton from "@/components/ui/user/SignInButton.svelte";
	import { isInstanceUrlBaked, isNative } from "@/lib/native/runtime";
</script>

<div class="space-y-2">
	<SignInButton />

	{#if isSupportedFeature("auth")}
		<ProfileCard />
	{/if}

	{#if isSupportedFeature("personalShiny") && getUserDetails().details && hasFeatureAnywhere(getUserDetails().permissions, Features.POKEMON_PERSONAL_SHINY)}
		<SectionTrainers />
	{/if}

	<SectionAppearance />
	<SectionIcons />
	<SectionAdvanced />
	{#if isNative() && !isInstanceUrlBaked()}
		<SectionInstance />
	{/if}
</div>
