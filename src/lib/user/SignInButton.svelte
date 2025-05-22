<script lang="ts">
	import Button from '@/components/ui/basic/Button.svelte';
	import { getLoginLink } from '@/lib/user/login';
	import DiscordIcon from '@/components/icons/DiscordIcon.svelte';
	import { X } from 'lucide-svelte';
</script>

<Button
	class="gap-3! items-center w-full bg-card"
	variant="ghost"
	size="sm"
	tag="a"
	href={getLoginLink()}
>
	<DiscordIcon class="w-4 fill-foreground shrink-0" />
	<p class="text-sm">
		To unlock more features,
		<a href={getLoginLink()} class="underline text-accent-foreground font-semibold">link your Discord account</a>
	</p>
</Button>

<!--<div class="flex gap-3 items-center">-->

<!--</div>-->