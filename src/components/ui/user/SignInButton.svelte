<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { getLoginLink } from '@/lib/services/user/login';
	import DiscordIcon from '@/components/icons/DiscordIcon.svelte';
	import { X } from 'lucide-svelte';
	import * as m from '@/lib/paraglide/messages';
</script>

<Button
	class="px-4 py-2 gap-3! items-center w-full bg-card border rounded-lg shadow-lg flex justify-center hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground pointer-events-auto disabled:pointer-events-none"
	variant=""
	size=""
	tag="a"
	href={getLoginLink()}
>
	<DiscordIcon class="w-4 fill-foreground shrink-0" />
	<p class="text-sm">
		{m.signin_prompt_part_1()}
		<a href={getLoginLink()} class="underline font-semibold">
			{m.signin_prompt_bold()}
		</a>
		{m.signin_prompt_part_2()}
	</p>
</Button>
