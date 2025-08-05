<script lang="ts">
	import Button from '@/components/ui/basic/Button.svelte';
	import { RadioGroup } from "bits-ui";
	import { getIconItem, getIconPokemon } from '@/lib/uicons.svelte';
</script>

<div>
	<RadioGroup.Root class="flex gap-1" value="emoji">
		<RadioGroup.Item value="emoji">
			<Button size="icon" variant="outline">
				<span>😀</span>
			</Button>
		</RadioGroup.Item>
		<RadioGroup.Item value="pokemon">
			<Button size="icon" variant="outline">
				<img class="size-5" src={getIconPokemon({ pokemon_id: 25 })} alt="Pokemon" >
			</Button>
		</RadioGroup.Item>
		<RadioGroup.Item value="item">
			<Button size="icon" variant="outline">
				<img class="size-5" src={getIconItem(1)} alt="Pokemon" >
			</Button>
		</RadioGroup.Item>
	</RadioGroup.Root>
	<div class="flex flex-wrap border-border rounded-md border mt-1">
		{#each [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19] as monId}
			<Button size="icon" variant="ghost">
				<img class="size-5" src={getIconPokemon({ pokemon_id: monId })} alt="Pokemon" >
			</Button>
		{/each}
	</div>
</div>