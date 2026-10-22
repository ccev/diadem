<script lang="ts">
	import { Image } from "@lucide/svelte";
	import MenuCard from "@/components/menus/MenuCard.svelte";

	import IconSelect from "@/components/menus/profile/IconSelect.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
</script>

<MenuCard title="Icon Style" Icon={Image}>
	<IconSelect title="Pokémon" type={MapObjectType.POKEMON} getIconParams={{ pokemon_id: 25 }} />
	<IconSelect title="Pokéstop" type={MapObjectType.POKESTOP} />
	<IconSelect title="Gym" type={MapObjectType.GYM} />
	<IconSelect title="Power Spot" type={MapObjectType.STATION} />
</MenuCard>
