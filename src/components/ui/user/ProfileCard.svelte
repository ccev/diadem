<script lang="ts">
	import Button from '@/components/ui/basic/Button.svelte';
	import { getUserDetails } from '@/lib/user/userDetails.svelte.js';
	import { getLoginLink } from '@/lib/user/login';
	import * as m from '@/lib/paraglide/messages';
	import LogOutButton from '@/components/ui/user/LogOutButton.svelte';
	import { Avatar } from 'bits-ui';
	import DiscordIcon from '@/components/icons/DiscordIcon.svelte';

	let details = $derived(getUserDetails().details);
	let isLoggingOut = $state(false)
</script>

<div
	class="py-4 px-4 mx-2 rounded-lg border bg-card text-card-foreground shadow-md"
	class:animate-pulse={isLoggingOut}
>
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
				<LogOutButton class="" variant="secondary" bind:isLoggingOut>
					{m.signout()}
				</LogOutButton>
			</div>

		</div>
	{:else}
		<div class="flex gap-4">

			<Button
				class="w-full"
				variant="default"
				tag="a"
				href={getLoginLink()}
			>
				<DiscordIcon class="w-4 fill-primary-foreground" />
				<span>
					Link with Discord
				</span>
			</Button>
			<Button
				class="w-full"
				variant="secondary"
				tag="a"
				href=""
			>
				<span>
					Join Server
				</span>
			</Button>
		</div>
	{/if}
</div>
