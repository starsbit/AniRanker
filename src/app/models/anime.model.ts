export interface Anime {
  id: number;
  title: string;
  imageUrl?: string;
  elo: number;
  comparisons: number;
  rating?: number;
  type: 'anime' | 'manga';
}

export interface ComparisonState {
  currentPair: [Anime, Anime] | null;
  comparisonsDone: number;
  totalComparisons: number;
  isComplete: boolean;
}

export interface MalAnimeData {
  series_animedb_id: string;
  series_title: string;
  my_status: string;
  my_score: string;
}
