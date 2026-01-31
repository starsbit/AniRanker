# AniRanker

A pairwise comparison-based anime and manga ranking application. AniRanker uses the Bradley-Terry model to generate accurate ratings through head-to-head comparisons.

**Live Site:** https://aniranker.starsbit.space

## Overview

AniRanker allows users to import their MyAnimeList (MAL) export files and rank their anime or manga through intuitive pairwise comparisons. The application employs the Bradley-Terry statistical model to calculate ratings based on user preferences.

## Features

- **Import MAL Data**: Upload your MyAnimeList XML export to import completed anime or manga
- **Pairwise Comparisons**: Simple A/B choice interface for ranking items
- **Bradley-Terry Model**: Statistical algorithm that generates accurate ratings from comparison data
- **Progress Persistence**: Saves ranking progress to localStorage for resuming later
- **Undo/Redo**: Full history support for correcting mistakes
- **Export Results**: Download updated MAL XML with new ratings
- **Lazy Image Loading**: Efficient image fetching from Jikan API with rate limit handling

## How It Works

1. **Import**: Upload your MAL XML export file
2. **Compare**: Choose your preferred item in each head-to-head matchup
3. **Rate**: The Bradley-Terry algorithm calculates strength parameters based on your choices
4. **Normalize**: Final ratings are normalized to a 1-10 scale with mean 7.0
5. **Export**: Download your ranked list back to MAL format

## Technical Details

### Bradley-Terry Model

The application uses the Bradley-Terry model for paired comparison analysis. The strength parameter for each item is calculated using an iterative MM algorithm:

```
strength_i = wins_i / sum_j(total_comparisons_ij / (strength_i + strength_j))
```

The algorithm converges to maximum likelihood estimates of item strengths.

### Architecture

- **Frontend**: Angular 21 with standalone components
- **Styling**: Tailwind CSS with Angular Material components
- **State Management**: Angular signals for reactive state
- **Image API**: Jikan API v4 for anime/manga images
- **Testing**: Vitest for unit testing

## Development

### Prerequisites

- Node.js v22+
- npm or yarn

### Installation

```bash
git clone https://github.com/starsbit/AniRanker.git
cd AniRanker
npm install
```

### Development Server

```bash
npm start
```

Navigate to `http://localhost:4200/`.

### Build

```bash
npm run build
```

Build artifacts will be stored in `dist/`.

### Testing

```bash
npm test
```

Run unit tests with Vitest.

## Deployment

The application is configured for deployment on Vercel. Connect your GitHub repository to Vercel for automatic deployments on push to main.

## Exporting from MyAnimeList

1. Go to your MAL profile
2. Click "Export" on your anime or manga list
3. Download the XML file
4. Upload to AniRanker

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## License

MIT License

## Acknowledgments

- [Jikan API](https://jikan.moe/) for anime/manga data
- [MyAnimeList](https://myanimelist.net/) for the original platform
