export interface Anime {
  id: number;
  title: string;
  main_picture: {
    medium: string;
    large: string;
  };
  rating?: number;
  elo?: number;
  comparisons?: number;
}

export interface AnimeNode {
  node: Anime;
  list_status?: {
    status: string;
    score: number;
  };
}

export interface MalData {
  data: AnimeNode[];
}
