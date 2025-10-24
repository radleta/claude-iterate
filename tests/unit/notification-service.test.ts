import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationService } from '../../src/services/notification-service.js';
import { Metadata } from '../../src/types/metadata.js';

describe('NotificationService', () => {
  let service: NotificationService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new NotificationService(undefined, false);
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('send()', () => {
    it('should send notification successfully', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      const result = await service.send('Test message', {
        url: 'https://ntfy.sh/test',
      });

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://ntfy.sh/test',
        expect.objectContaining({
          method: 'POST',
          body: 'Test message',
        })
      );
    });

    it('should include title header', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await service.send('Test', {
        url: 'https://ntfy.sh/test',
        title: 'My Title',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Title: 'My Title',
          }),
        })
      );
    });

    it('should include priority header', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await service.send('Test', {
        url: 'https://ntfy.sh/test',
        priority: 'high',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Priority: 'high',
          }),
        })
      );
    });

    it('should include tags header', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await service.send('Test', {
        url: 'https://ntfy.sh/test',
        tags: ['tag1', 'tag2'],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Tags: 'tag1,tag2',
          }),
        })
      );
    });

    it('should include all headers', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await service.send('Test', {
        url: 'https://ntfy.sh/test',
        title: 'My Title',
        priority: 'urgent',
        tags: ['tag1', 'tag2'],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Title: 'My Title',
            Priority: 'urgent',
            Tags: 'tag1,tag2',
          }),
        })
      );
    });

    it('should handle HTTP errors gracefully', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await service.send('Test', {
        url: 'https://ntfy.sh/test',
      });

      expect(result).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const result = await service.send('Test', {
        url: 'https://ntfy.sh/test',
      });

      expect(result).toBe(false);
    });

    it('should include Content-Type header', async () => {
      fetchMock.mockResolvedValue({ ok: true });

      await service.send('Test', {
        url: 'https://ntfy.sh/test',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'text/plain',
          }),
        })
      );
    });
  });

  describe('isConfigured()', () => {
    it('should return true when notifyUrl is configured', () => {
      const metadata = {
        notifyUrl: 'https://ntfy.sh/test',
      } as Metadata;

      expect(service.isConfigured(metadata)).toBe(true);
    });

    it('should return false when notifyUrl is undefined', () => {
      const metadata = {} as Metadata;

      expect(service.isConfigured(metadata)).toBe(false);
    });

    it('should return false when notifyUrl is empty string', () => {
      const metadata = {
        notifyUrl: '',
      } as Metadata;

      expect(service.isConfigured(metadata)).toBe(false);
    });

    it('should return false when notifyUrl is whitespace', () => {
      const metadata = {
        notifyUrl: '   ',
      } as Metadata;

      expect(service.isConfigured(metadata)).toBe(false);
    });
  });

  describe('shouldNotify()', () => {
    it('should default to all events', () => {
      const metadata = {
        notifyEvents: ['all'],
      } as Metadata;

      // All events should be enabled when 'all' is specified
      expect(service.shouldNotify('iteration', metadata)).toBe(true);
      expect(service.shouldNotify('completion', metadata)).toBe(true);
      expect(service.shouldNotify('error', metadata)).toBe(true);
      expect(service.shouldNotify('status_update', metadata)).toBe(true);
      expect(service.shouldNotify('execution_start', metadata)).toBe(true);
      expect(service.shouldNotify('setup_complete', metadata)).toBe(true);
      expect(service.shouldNotify('iteration_milestone', metadata)).toBe(true);
    });

    it('should respect configured events', () => {
      const metadata = {
        notifyEvents: ['execution_start', 'completion'],
      } as Metadata;

      expect(service.shouldNotify('execution_start', metadata)).toBe(true);
      expect(service.shouldNotify('completion', metadata)).toBe(true);
      expect(service.shouldNotify('error', metadata)).toBe(false);
      expect(service.shouldNotify('setup_complete', metadata)).toBe(false);
    });

    it('should notify all events when "all" specified', () => {
      const metadata = {
        notifyEvents: ['all'],
      } as Metadata;

      expect(service.shouldNotify('setup_complete', metadata)).toBe(true);
      expect(service.shouldNotify('execution_start', metadata)).toBe(true);
      expect(service.shouldNotify('iteration_milestone', metadata)).toBe(true);
      expect(service.shouldNotify('completion', metadata)).toBe(true);
      expect(service.shouldNotify('error', metadata)).toBe(true);
    });

    it('should return false for empty notifyEvents array', () => {
      const metadata = {
        notifyEvents: [],
      } as Partial<Metadata> as Metadata;

      // Empty array means no events (explicit choice)
      expect(service.shouldNotify('iteration', metadata)).toBe(false);
      expect(service.shouldNotify('completion', metadata)).toBe(false);
      expect(service.shouldNotify('error', metadata)).toBe(false);
      expect(service.shouldNotify('execution_start', metadata)).toBe(false);
    });

    it('should handle single event', () => {
      const metadata = {
        notifyEvents: ['completion'],
      } as Metadata;

      expect(service.shouldNotify('completion', metadata)).toBe(true);
      expect(service.shouldNotify('error', metadata)).toBe(false);
    });

    it('should handle multiple specific events', () => {
      const metadata = {
        notifyEvents: [
          'setup_complete',
          'execution_start',
          'iteration',
          'iteration_milestone',
          'completion',
          'error',
        ],
      } as Metadata;

      expect(service.shouldNotify('setup_complete', metadata)).toBe(true);
      expect(service.shouldNotify('execution_start', metadata)).toBe(true);
      expect(service.shouldNotify('iteration', metadata)).toBe(true);
      expect(service.shouldNotify('iteration_milestone', metadata)).toBe(true);
      expect(service.shouldNotify('completion', metadata)).toBe(true);
      expect(service.shouldNotify('error', metadata)).toBe(true);
    });
  });
});
