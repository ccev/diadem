import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
import type { GymData } from '@/lib/types/mapObjectData/gym';
import type { StationData } from '@/lib/types/mapObjectData/station';

export type MapData = PokemonData | PokestopData | GymData | StationData
export type MapObjectType = "pokemon" | "pokestop" | "gym" | "station"
export type MinorMapObjectType = "s2cell"