<script lang="ts">
	import Card from '@/components/ui/basic/Card.svelte';
	import Button from '@/components/ui/basic/Button.svelte';
	import { getUserDetails, updateUserDetails } from '@/lib/user/userDetails.svelte';
	import { Avatar } from 'bits-ui';
	import { getLoginLink } from '@/lib/user/login';
	import { isSupportedFeature } from '@/lib/enabledFeatures';
	import { redirect } from '@sveltejs/kit';
	import { goto } from '$app/navigation';

	let details = $derived(getUserDetails().details);

	async function logout() {
		await fetch('/logout');

		if (isSupportedFeature("authRequired")) {
			goto(getLoginLink())
		} else {
			await updateUserDetails();
		}
	}
</script>

<Card class="py-4 px-4 mx-2">
	{#if details}
		<div class="flex items-center justify-start gap-4 w-full">
			<Avatar.Root
				class="shrink-0 bg-muted text-muted-foreground h-12 w-12 rounded-full text-lg uppercase"
			>
				<div
					class="flex h-full w-full items-center justify-center overflow-hidden rounded-full"
				>
					<Avatar.Image src={details.avatarUrl} alt={details.displayName} />
					<Avatar.Fallback>
						{details.displayName?.[0]}
					</Avatar.Fallback>
				</div>
			</Avatar.Root>

			<p>
				<b class="-mb-1">
					{details.displayName}
				</b>
				<br />
				<span class="text-muted-foreground">
				{details.username}
			</span>
			</p>
			<div class="flex-1 flex justify-end">
				<Button class="" variant="secondary" onclick={logout}>
					Sign out
				</Button>
			</div>

		</div>
	{:else}
		<Button
			variant="default"
			tag="a"
			href={getLoginLink()}
		>
			Sign In
		</Button>
	{/if}
</Card>
