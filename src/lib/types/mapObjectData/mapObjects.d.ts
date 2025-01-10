import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';

export type MapData = PokemonData | PokestopData;
export type MapObjectType = "pokemon" | "pokestop"
