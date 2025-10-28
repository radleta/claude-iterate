import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateStats,
  formatDuration,
  formatRelativeTime,
  type BaseStats,
} from '../../../src/types/iteration-stats.js';

describe('iteration-stats', () => {
  describe('calculateStats', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate elapsed seconds correctly', () => {
      const startTime = new Date('2025-01-01T00:00:00Z');
      vi.setSystemTime(new Date('2025-01-01T00:05:42Z')); // 5m 42s later

      const base: BaseStats = {
        currentIteration: 3,
        maxIterations: 50,
        tasksCompleted: null,
        tasksTotal: null,
        startTime,
        lastUpdateTime: new Date(),
        iterationDurations: [],
        mode: 'loop',
        status: 'starting',
        stopRequested: false,
        stopSource: null,
      };

      const result = calculateStats(base);
      expect(result.elapsedSeconds).toBe(342); // 5 * 60 + 42
    });

    it('should calculate average iteration time from last 5 durations', () => {
      const base: BaseStats = {
        currentIteration: 7,
        maxIterations: 50,
        tasksCompleted: null,
        tasksTotal: null,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        iterationDurations: [27000, 28000, 29000, 27000, 28000, 26000, 30000], // 7 iterations
        mode: 'loop',
        status: 'running',
        stopRequested: false,
        stopSource: null,
      };

      const result = calculateStats(base);
      // Last 5: [29000, 27000, 28000, 26000, 30000]
      // Average: (29000 + 27000 + 28000 + 26000 + 30000) / 5 = 28000ms = 28s
      expect(result.avgIterationSeconds).toBe(28);
    });

    it('should return 0 for average when no durations', () => {
      const base: BaseStats = {
        currentIteration: 0,
        maxIterations: 50,
        tasksCompleted: null,
        tasksTotal: null,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        iterationDurations: [],
        mode: 'loop',
        status: 'starting',
        stopRequested: false,
        stopSource: null,
      };

      const result = calculateStats(base);
      expect(result.avgIterationSeconds).toBe(0);
    });

    it('should calculate ETA when enough data (>=5 iterations)', () => {
      const base: BaseStats = {
        currentIteration: 12,
        maxIterations: 50,
        tasksCompleted: null,
        tasksTotal: null,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        iterationDurations: [27000, 28000, 29000, 27000, 28000], // 5 iterations
        mode: 'loop',
        status: 'running',
        stopRequested: false,
        stopSource: null,
      };

      const result = calculateStats(base);
      // Average: (27000 + 28000 + 29000 + 27000 + 28000) / 5 = 27800ms = 27s
      // Remaining: 50 - 12 = 38 iterations
      // ETA: 38 * 27 = 1026 seconds
      expect(result.etaSeconds).toBe(1026);
    });

    it('should return null ETA when <5 iterations', () => {
      const base: BaseStats = {
        currentIteration: 3,
        maxIterations: 50,
        tasksCompleted: null,
        tasksTotal: null,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        iterationDurations: [27000, 28000, 26000], // Only 3 iterations
        mode: 'loop',
        status: 'running',
        stopRequested: false,
        stopSource: null,
      };

      const result = calculateStats(base);
      expect(result.etaSeconds).toBeNull();
    });

    it('should return null ETA when average is 0', () => {
      const base: BaseStats = {
        currentIteration: 5,
        maxIterations: 50,
        tasksCompleted: null,
        tasksTotal: null,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        iterationDurations: [0, 0, 0, 0, 0], // All zero durations
        mode: 'loop',
        status: 'running',
        stopRequested: false,
        stopSource: null,
      };

      const result = calculateStats(base);
      expect(result.etaSeconds).toBeNull();
    });

    it('should preserve all base stats fields', () => {
      const base: BaseStats = {
        currentIteration: 5,
        maxIterations: 50,
        tasksCompleted: 35,
        tasksTotal: 60,
        startTime: new Date(),
        lastUpdateTime: new Date(),
        iterationDurations: [27000],
        mode: 'iterative',
        status: 'running',
        stagnationCount: 2,
        stopRequested: true,
        stopSource: 'keyboard',
      };

      const result = calculateStats(base);
      expect(result.currentIteration).toBe(5);
      expect(result.maxIterations).toBe(50);
      expect(result.tasksCompleted).toBe(35);
      expect(result.tasksTotal).toBe(60);
      expect(result.mode).toBe('iterative');
      expect(result.status).toBe('running');
      expect(result.stagnationCount).toBe(2);
      expect(result.stopRequested).toBe(true);
      expect(result.stopSource).toBe('keyboard');
    });
  });

  describe('formatDuration', () => {
    it('should format 0 seconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should format seconds <60', () => {
      expect(formatDuration(5)).toBe('5s');
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(59)).toBe('59s');
    });

    it('should format exactly 60 seconds as 1m', () => {
      expect(formatDuration(60)).toBe('1m');
    });

    it('should format minutes without seconds', () => {
      expect(formatDuration(120)).toBe('2m');
      expect(formatDuration(300)).toBe('5m');
    });

    it('should format minutes with seconds', () => {
      expect(formatDuration(90)).toBe('1m 30s');
      expect(formatDuration(150)).toBe('2m 30s');
    });

    it('should format exactly 3599 seconds as 59m 59s', () => {
      expect(formatDuration(3599)).toBe('59m 59s');
    });

    it('should format exactly 3600 seconds as 1h 0m', () => {
      expect(formatDuration(3600)).toBe('1h 0m');
    });

    it('should format hours with minutes', () => {
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h 0m');
      expect(formatDuration(7320)).toBe('2h 2m');
    });

    it('should format large durations', () => {
      expect(formatDuration(86400)).toBe('24h 0m'); // 24 hours
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "just now" for <5 seconds', () => {
      expect(formatRelativeTime(new Date('2025-01-01T12:00:00Z'))).toBe(
        'just now'
      );
      expect(formatRelativeTime(new Date('2025-01-01T11:59:56Z'))).toBe(
        'just now'
      );
    });

    it('should return "Xs ago" for 5-59 seconds', () => {
      expect(formatRelativeTime(new Date('2025-01-01T11:59:55Z'))).toBe(
        '5s ago'
      );
      expect(formatRelativeTime(new Date('2025-01-01T11:59:50Z'))).toBe(
        '10s ago'
      );
      expect(formatRelativeTime(new Date('2025-01-01T11:59:01Z'))).toBe(
        '59s ago'
      );
    });

    it('should return "Xm ago" for >=60 seconds', () => {
      expect(formatRelativeTime(new Date('2025-01-01T11:59:00Z'))).toBe(
        '1m ago'
      );
      expect(formatRelativeTime(new Date('2025-01-01T11:58:00Z'))).toBe(
        '2m ago'
      );
      expect(formatRelativeTime(new Date('2025-01-01T11:55:00Z'))).toBe(
        '5m ago'
      );
    });
  });
});
