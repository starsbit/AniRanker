# MAL-Ranker Architecture Plan

## Project Overview
Angular web application for ranking anime via pairwise comparisons using Elo rating system.

## Data Models

### Anime
```typescript
interface Anime {
  id: number;
  title: string;
  main_picture: {
    medium: string;
    large: string;
  };
  rating?: number; // Computed 1-10
  elo?: number;    // Internal Elo score
}
```

### Comparison State
```typescript
interface ComparisonState {
  animeList: Anime[];
  currentPair: [Anime, Anime] | null;
  comparisonsDone: number;
  totalComparisons: number;
  isComplete: boolean;
}
```

## Services

### AnimeService
- Load anime from JSON file
- Store current anime list
- Filter completed anime only

### RankingService
- Elo rating calculations
- Pair selection algorithm (adaptive merge-sort style)
- Rating normalization (mean=7.00, scale 1-10)
- Export to MAL format

## Pages/Components

### HomeComponent
- Landing page with app description
- "Start Ranking" button
- Hero section with anime imagery

### AboutComponent
- Algorithm explanation
- How Elo ratings work
- FAQ section

### ContactComponent
- Contact information
- GitHub link

### ImportComponent
- File upload for MAL JSON
- Validation of uploaded data
- Preview loaded anime

### RankerComponent
- Two anime cards side-by-side
- Progress indicator
- Skip option
- Completion state

### ResultsComponent
- Table of ranked anime
- Sortable columns
- Export button
- Re-rank option

## Routing
```
/          -> Home
/about     -> About
/contact   -> Contact
/import    -> Import
/rank      -> Ranker
/results   -> Results
```

## Elo Rating Algorithm

### Parameters
- Initial Elo: 1500
- K-factor: 32 (adjustable)
- Expected score: 1 / (1 + 10^((Rb-Ra)/400))

### Normalization
After all comparisons:
1. Calculate mean and std dev of Elo scores
2. Map to 1-10 scale with mean at 7.0
3. Clamp to valid range [1, 10]

### Pair Selection Strategy
Use merge-sort tournament style:
1. Start with random pairs to establish baseline
2. Use quicksort-like partitioning to minimize comparisons
3. Target ~N*log(N) comparisons for N anime

## MAL Export Format
Generate JSON matching MAL import format with computed scores.

## Styling
- Angular Material components only
- Indigo-Pink theme
- Responsive design with flexbox/grid
