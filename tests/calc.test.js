import { describe, it, expect } from 'vitest';
import { computeStats, aggregate } from '../src/utils/calc';

describe('CAT Scoring and Metrics Calculations', () => {
  describe('computeStats', () => {
    it('calculates metrics correctly with negative marking enabled', () => {
      const stats = computeStats({
        attempted: 10,
        correct: 8,
        timeTaken: 20,
        negativeMarking: true,
      });

      expect(stats.attempted).toBe(10);
      expect(stats.correct).toBe(8);
      expect(stats.wrong).toBe(2);
      expect(stats.timeTaken).toBe(20);
      expect(stats.accuracy).toBe(80); // (8/10) * 100
      expect(stats.marks).toBe(22); // 8 * 3 - 2 * 1
      expect(stats.marksLost).toBe(2); // 2 * 1
      expect(stats.marksPerMinute).toBe(1.1); // 22 / 20
      expect(stats.timePerQuestion).toBe(2); // 20 / 10
    });

    it('calculates metrics correctly for TITA questions (negative marking disabled)', () => {
      const stats = computeStats({
        attempted: 10,
        correct: 8,
        timeTaken: 20,
        negativeMarking: false,
      });

      expect(stats.attempted).toBe(10);
      expect(stats.correct).toBe(8);
      expect(stats.wrong).toBe(2);
      expect(stats.marks).toBe(24); // 8 * 3 (no penalty)
      expect(stats.marksLost).toBe(0);
      expect(stats.marksPerMinute).toBe(1.2); // 24 / 20
    });

    it('handles edge case of 0 attempts safely', () => {
      const stats = computeStats({
        attempted: 0,
        correct: 0,
        timeTaken: 10,
        negativeMarking: true,
      });

      expect(stats.attempted).toBe(0);
      expect(stats.correct).toBe(0);
      expect(stats.wrong).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.marks).toBe(0);
      expect(stats.marksPerMinute).toBe(0);
      expect(stats.timePerQuestion).toBe(0);
    });

    it('handles missing/undefined numeric inputs safely for concept-only logging', () => {
      const stats = computeStats({
        attempted: undefined,
        correct: undefined,
        timeTaken: undefined,
        negativeMarking: true,
      });

      expect(stats.attempted).toBe(0);
      expect(stats.correct).toBe(0);
      expect(stats.wrong).toBe(0);
      expect(stats.timeTaken).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.marks).toBe(0);
      expect(stats.marksPerMinute).toBe(0);
      expect(stats.timePerQuestion).toBe(0);
    });
  });

  describe('aggregate', () => {
    it('aggregates multiple session entries correctly', () => {
      const entries = [
        { attempted: 10, correct: 8, wrong: 2, timeTaken: 20, marks: 22, marksLost: 2 },
        { attempted: 5, correct: 5, wrong: 0, timeTaken: 10, marks: 15, marksLost: 0 },
      ];

      const agg = aggregate(entries);

      expect(agg.attempted).toBe(15);
      expect(agg.correct).toBe(13);
      expect(agg.wrong).toBe(2);
      expect(agg.timeTaken).toBe(30);
      expect(agg.marks).toBe(37);
      expect(agg.marksLost).toBe(2);
      expect(agg.accuracy).toBe(86.67); // round((13/15)*100)
      expect(agg.marksPerMinute).toBe(1.23); // round(37/30)
    });
  });
});
