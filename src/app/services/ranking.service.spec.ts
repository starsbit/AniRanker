import { TestBed } from '@angular/core/testing';
import { RankingService } from './ranking.service';
import { Anime } from '../models/anime.model';

describe('RankingService - Bradley-Terry Model', () => {
  let service: RankingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RankingService);
  });

  afterEach(() => {
    service.reset();
  });

  describe('Basic Bradley-Terry Functionality', () => {
    it('should initialize all anime with strength 1.0', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Anime A', type: 'anime', elo: 0, comparisons: 0 },
        { id: 2, title: 'Anime B', type: 'anime', elo: 0, comparisons: 0 },
        { id: 3, title: 'Anime C', type: 'anime', elo: 0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const list = service.getAnimeList();

      expect(list.every(a => a.elo === 1.0)).toBe(true);
    });

    it('should increase winner strength and decrease loser strength after comparison', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Winner', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'Loser', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [animeA, animeB] = service.getAnimeList();
      
      service.recordComparison(animeA, animeB);
      
      const updated = service.getAnimeList();
      const winner = updated.find(a => a.id === 1)!;
      const loser = updated.find(a => a.id === 2)!;

      expect(winner.elo).toBeGreaterThan(1.0);
      expect(loser.elo).toBeLessThan(1.0);
    });

    it('should correctly calculate wins from comparison matrix', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Berserk', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'Naruto', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 3, title: 'One Piece', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [berserk, naruto, onePiece] = service.getAnimeList();
      
      // Berserk beats everyone 5 times each
      for (let i = 0; i < 5; i++) {
        service.recordComparison(berserk, naruto);
        service.recordComparison(berserk, onePiece);
      }

      const updated = service.getAnimeList();
      const berserkUpdated = updated.find(a => a.id === 1)!;
      
      // Berserk should have the highest strength (10 wins, 0 losses)
      expect(berserkUpdated.elo).toBeGreaterThan(1.0);
      expect(berserkUpdated.wins).toBe(10);
    });
  });

  describe('Bradley-Terry Mathematical Properties', () => {
    it('should preserve transitivity: if A>B and B>C, then A>C in rankings', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'A', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'B', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 3, title: 'C', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [a, b, c] = service.getAnimeList();
      
      // A beats B, B beats C
      for (let i = 0; i < 3; i++) {
        service.recordComparison(a, b);
        service.recordComparison(b, c);
      }

      const ratings = service.calculateFinalRatings();
      const aRating = ratings.find(r => r.id === 1)!.rating!;
      const bRating = ratings.find(r => r.id === 2)!.rating!;
      const cRating = ratings.find(r => r.id === 3)!.rating!;

      expect(aRating).toBeGreaterThan(bRating);
      expect(bRating).toBeGreaterThan(cRating);
    });

    it('should handle perfect win record correctly (16-0 case)', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Undefeated', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'Opponent1', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 3, title: 'Opponent2', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [undefeated, opp1, opp2] = service.getAnimeList();
      
      // Undefeated wins 8 against each opponent
      for (let i = 0; i < 8; i++) {
        service.recordComparison(undefeated, opp1);
        service.recordComparison(undefeated, opp2);
      }

      const ratings = service.calculateFinalRatings();
      const undefeatedRating = ratings.find(r => r.id === 1)!;
      
      // Should be ranked #1 with a high rating
      expect(ratings[0].id).toBe(1); // First in sorted list
      expect(undefeatedRating.rating).toBeGreaterThan(8.0);
      expect(undefeatedRating.wins).toBe(16);
    });

    it('should handle strength differences appropriately', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Strong', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'Weak', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [strong, weak] = service.getAnimeList();
      
      // Strong wins 10 times against weak
      for (let i = 0; i < 10; i++) {
        service.recordComparison(strong, weak);
      }

      const updated = service.getAnimeList();
      const strongStrength = updated.find(a => a.id === 1)!.elo;
      const weakStrength = updated.find(a => a.id === 2)!.elo;

      // Strength ratio should reflect win ratio (approximately)
      // With 10-0 record, strong should be much stronger
      expect(strongStrength / weakStrength).toBeGreaterThan(5);
    });

    it('should converge to similar strengths for 50-50 split', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'A', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'B', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [a, b] = service.getAnimeList();
      
      // A and B split wins evenly
      for (let i = 0; i < 5; i++) {
        service.recordComparison(a, b);
        service.recordComparison(b, a);
      }

      const updated = service.getAnimeList();
      const strengthA = updated.find(anime => anime.id === 1)!.elo;
      const strengthB = updated.find(anime => anime.id === 2)!.elo;

      // Strengths should be close to equal
      expect(Math.abs(strengthA - strengthB)).toBeLessThan(0.1);
    });
  });

  describe('calculateFinalRatings', () => {
    it('should return ratings within 1-10 range', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'A', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'B', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [a, b] = service.getAnimeList();
      service.recordComparison(a, b);

      const ratings = service.calculateFinalRatings();
      
      ratings.forEach(r => {
        expect(r.rating).toBeGreaterThanOrEqual(1);
        expect(r.rating).toBeLessThanOrEqual(10);
      });
    });

    it('should sort by rating descending', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Best', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'Middle', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 3, title: 'Worst', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [best, middle, worst] = service.getAnimeList();
      
      // Best beats everyone, middle beats worst
      for (let i = 0; i < 3; i++) {
        service.recordComparison(best, middle);
        service.recordComparison(best, worst);
        service.recordComparison(middle, worst);
      }

      const ratings = service.calculateFinalRatings();
      
      expect(ratings[0].id).toBe(1); // Best
      expect(ratings[1].id).toBe(2); // Middle
      expect(ratings[2].id).toBe(3); // Worst
    });

    it('should handle empty anime list', () => {
      service.initializeRanking([]);
      const ratings = service.calculateFinalRatings();
      expect(ratings).toEqual([]);
    });

    it('should handle single anime', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Solo', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const ratings = service.calculateFinalRatings();
      
      expect(ratings.length).toBe(1);
      expect(ratings[0].rating).toBe(7.0); // Should get mean rating
    });
  });

  describe('Edge Cases', () => {
    it('should handle anime with no comparisons gracefully', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'Active', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'Active2', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 3, title: 'Inactive', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [active, active2, inactive] = service.getAnimeList();
      
      // Only compare first two
      for (let i = 0; i < 3; i++) {
        service.recordComparison(active, active2);
      }

      const updated = service.getAnimeList();
      const inactiveAnime = updated.find(a => a.id === 3)!;
      
      // Inactive anime should still have strength 1.0
      expect(inactiveAnime.elo).toBe(1.0);
    });

    it('should maintain reasonable ratings with many anime', () => {
      const animeList: Anime[] = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Anime ${i + 1}`,
        type: 'anime' as const,
        elo: 1.0,
        comparisons: 0
      }));

      service.initializeRanking(animeList);
      const list = service.getAnimeList();
      
      // Create a clear hierarchy: anime 1 beats all, anime 2 beats all except 1, etc.
      for (let i = 0; i < 20; i++) {
        for (let j = i + 1; j < 20; j++) {
          const winner = list.find(a => a.id === i + 1)!;
          const loser = list.find(a => a.id === j + 1)!;
          service.recordComparison(winner, loser);
        }
      }

      const ratings = service.calculateFinalRatings();
      
      // Ratings should be spread out
      expect(ratings[0].rating!).toBeGreaterThan(ratings[10].rating!);
      expect(ratings[10].rating!).toBeGreaterThan(ratings[19].rating!);
      
      // All ratings should be valid
      ratings.forEach(r => {
        expect(r.rating).toBeGreaterThanOrEqual(1);
        expect(r.rating).toBeLessThanOrEqual(10);
        expect(r.rating).not.toBeNaN();
      });
    });
  });

  describe('Undo/Redo with Bradley-Terry', () => {
    it('should restore correct strengths after undo', () => {
      const animeList: Anime[] = [
        { id: 1, title: 'A', type: 'anime', elo: 1.0, comparisons: 0 },
        { id: 2, title: 'B', type: 'anime', elo: 1.0, comparisons: 0 }
      ];

      service.initializeRanking(animeList);
      const [a, b] = service.getAnimeList();
      
      service.recordComparison(a, b);
      const strengthAfterWin = service.getAnimeList().find(anime => anime.id === 1)!.elo;
      
      service.undo();
      const strengthAfterUndo = service.getAnimeList().find(anime => anime.id === 1)!.elo;
      
      expect(strengthAfterUndo).toBe(1.0); // Back to initial
      expect(strengthAfterWin).toBeGreaterThan(strengthAfterUndo);
    });
  });
});
