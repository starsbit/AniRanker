# MAL Ranker

An Angular web application for ranking anime via pairwise comparisons using the Elo rating system.

## Features

- **Import**: Upload your MyAnimeList JSON export
- **Pairwise Ranking**: Compare anime head-to-head to build your true rankings
- **Smart Algorithm**: Elo-based rating system with adaptive comparison selection
- **Export**: Download your computed ratings in MAL-compatible format

## How It Works

Instead of manually rating each anime on a 1-10 scale, MAL Ranker asks you simple questions: "Which anime do you prefer?" Through a series of comparisons, the algorithm builds a precise ranking of your preferences.

### The Algorithm

1. **Elo Rating**: Each anime starts with a rating of 1500. Wins and losses adjust ratings based on opponent strength.
2. **Adaptive Selection**: Uses tournament-style pairing to minimize required comparisons (~N×log(N) for N anime).
3. **Normalization**: Final ratings are scaled to 1-10 with a mean of 7.0, matching MAL's distribution.

## Tech Stack

- Angular 19
- Angular Material
- TypeScript
- Elo Rating Algorithm

## Development

```bash
# Install dependencies
npm install

# Start development server
ng serve

# Build for production
ng build
```

## Usage

1. Export your anime list from MyAnimeList (JSON format)
2. Upload the file on the Import page
3. Complete pairwise comparisons
4. View and export your results

## License

MIT
