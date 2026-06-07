<script lang="ts">
	import { Image } from "lucide-svelte";
	import MenuCard from "@/components/menus/MenuCard.svelte";
	import * as m from "@/lib/paraglide/messages";
	import IconSelect from "@/components/menus/profile/IconSelect.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
</script>

<MenuCard title={m.settings_icons()} Icon={Image}>
	<IconSelect title={m.pogo_pokemon()} type={MapObjectType.POKEMON} getIconParams={{ pokemon_id: 25 }} />
	<IconSelect title={m.pogo_pokestop()} type={MapObjectType.POKESTOP} />
	<IconSelect title={m.pogo_gym()} type={MapObjectType.GYM} />
	<IconSelect title={m.pogo_station()} type={MapObjectType.STATION} />
</MenuCard>
