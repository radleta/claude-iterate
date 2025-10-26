/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VerificationService } from '../../src/core/verification-service.js';
import { Workspace } from '../../src/core/workspace.js';
import { Logger } from '../../src/utils/logger.js';
import { RuntimeConfig } from '../../src/types/config.js';

// Mock file system
vi.mock('../../src/utils/fs.js', () => ({
  fileExists: vi.fn(),
  readText: vi.fn(),
}));

// Mock Claude client
vi.mock('../../src/services/claude-client.js', () => ({
  ClaudeClient: vi.fn().mockImplementation(() => ({
    isAvailable: vi.fn().mockResolvedValue(true),
    executeNonInteractive: vi.fn().mockResolvedValue('Mock Claude output'),
  })),
}));

// Mock templates
vi.mock('../../src/templates/system-prompt.js', () => ({
  getVerificationPrompt: vi.fn().mockResolvedValue('Mock verification prompt'),
  getWorkspaceSystemPrompt: vi.fn().mockResolvedValue('Mock system prompt'),
}));

describe('VerificationService', () => {
  let service: VerificationService;
  let mockLogger: Logger;
  let mockConfig: RuntimeConfig;
  let mockWorkspace: Workspace;

  beforeEach(async () => {
    mockLogger = new Logger(false);
    mockConfig = {
      verification: {
        depth: 'standard',
        reportFilename: 'verification-report.md',
        autoVerify: true,
        resumeOnFail: true,
        maxAttempts: 2,
        notifyOnVerification: false,
      },
      claudeCommand: 'claude',
      claudeArgs: [],
    } as RuntimeConfig;

    // Create mock workspace
    const workspacePath = '/tmp/test-workspace';
    mockWorkspace = {
      name: 'test-workspace',
      path: workspacePath,
      getMetadata: vi.fn().mockResolvedValue({
        name: 'test-workspace',
        mode: 'loop',
        status: 'completed',
      }),
      hasInstructions: vi.fn().mockResolvedValue(true),
      getInstructions: vi.fn().mockResolvedValue('# Test Instructions'),
    } as any;

    service = new VerificationService(mockLogger, mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('verify()', () => {
    it('should generate verification report with quick depth', async () => {
      const { fileExists, readText } = await import('../../src/utils/fs.js');
      (fileExists as any).mockResolvedValue(true);
      (readText as any).mockResolvedValue(`
# Verification Report

## Summary

All tasks complete.

✅ VERIFIED COMPLETE

**Confidence Level**: High
**Recommended Action**: Mark complete
      `);

      const result = await service.verify(mockWorkspace, { depth: 'quick' });

      expect(result.status).toBe('pass');
      expect(result.confidence).toBe('high');
      expect(result.recommendedAction).toBe('Mark complete');
    });

    it('should generate verification report with standard depth', async () => {
      const { fileExists, readText } = await import('../../src/utils/fs.js');
      (fileExists as any).mockResolvedValue(true);
      (readText as any).mockResolvedValue(`
# Verification Report

## Summary

Some issues found.

❌ INCOMPLETE

### Incomplete Requirements

1. **Task 1**: Not completed
2. **Task 2**: Partial implementation

**Confidence Level**: Medium
**Recommended Action**: Resume work
      `);

      const result = await service.verify(mockWorkspace, {
        depth: 'standard',
      });

      expect(result.status).toBe('fail');
      expect(result.issueCount).toBe(2);
      expect(result.issues).toContain('Task 1');
      expect(result.issues).toContain('Task 2');
      expect(result.confidence).toBe('medium');
      expect(result.recommendedAction).toBe('Resume work');
    });

    it('should generate verification report with deep depth', async () => {
      const { fileExists, readText } = await import('../../src/utils/fs.js');
      (fileExists as any).mockResolvedValue(true);
      (readText as any).mockResolvedValue(`
# Verification Report

## Summary

Comprehensive verification complete.

✅ VERIFIED

**Confidence Level**: High
**Recommended Action**: Deploy to production
      `);

      const result = await service.verify(mockWorkspace, { depth: 'deep' });

      expect(result.status).toBe('pass');
      expect(result.confidence).toBe('high');
    });

    it('should throw helpful error when report is not generated', async () => {
      const { fileExists } = await import('../../src/utils/fs.js');
      (fileExists as any).mockResolvedValue(false);

      await expect(service.verify(mockWorkspace)).rejects.toThrow(
        'Verification report not generated'
      );

      await expect(service.verify(mockWorkspace)).rejects.toThrow(
        'Expected location:'
      );

      await expect(service.verify(mockWorkspace)).rejects.toThrow(
        'Permission prompts blocked execution'
      );

      await expect(service.verify(mockWorkspace)).rejects.toThrow(
        '--dangerously-skip-permissions'
      );
    });

    it('should use custom report path when provided', async () => {
      const { fileExists, readText } = await import('../../src/utils/fs.js');
      const customPath = '/custom/path/report.md';

      (fileExists as any).mockImplementation((path: string) => {
        return Promise.resolve(path === customPath);
      });
      (readText as any).mockResolvedValue('✅ VERIFIED COMPLETE');

      await service.verify(mockWorkspace, { reportPath: customPath });

      expect(fileExists).toHaveBeenCalledWith(customPath);
    });

    it('should handle Claude execution errors gracefully', async () => {
      const { ClaudeClient } = await import(
        '../../src/services/claude-client.js'
      );

      // Mock Claude failure
      (ClaudeClient as any).mockImplementation(() => ({
        isAvailable: vi.fn().mockResolvedValue(true),
        executeNonInteractive: vi
          .fn()
          .mockRejectedValue(new Error('Claude failed')),
      }));

      // Recreate service with failing client
      const failingService = new VerificationService(mockLogger, mockConfig);

      await expect(failingService.verify(mockWorkspace)).rejects.toThrow(
        'Claude failed'
      );
    });

    it('should throw error when Claude CLI is not available', async () => {
      const { ClaudeClient } = await import(
        '../../src/services/claude-client.js'
      );

      // Mock Claude unavailable
      (ClaudeClient as any).mockImplementation(() => ({
        isAvailable: vi.fn().mockResolvedValue(false),
      }));

      // Recreate service with unavailable client
      const unavailableService = new VerificationService(
        mockLogger,
        mockConfig
      );

      await expect(unavailableService.verify(mockWorkspace)).rejects.toThrow(
        'Claude CLI not available'
      );
    });

    it('should use absolute paths for report', async () => {
      const { fileExists, readText } = await import('../../src/utils/fs.js');
      const { ClaudeClient } = await import(
        '../../src/services/claude-client.js'
      );

      // Ensure client is available
      (ClaudeClient as any).mockImplementation(() => ({
        isAvailable: vi.fn().mockResolvedValue(true),
        executeNonInteractive: vi.fn().mockResolvedValue('Mock Claude output'),
      }));

      (fileExists as any).mockResolvedValue(true);
      (readText as any).mockResolvedValue('✅ VERIFIED COMPLETE');

      await service.verify(mockWorkspace);

      // Check that absolute path was used (starts with /)
      const calls = (fileExists as any).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[0][0]).toMatch(/^\//); // Starts with /
    });

    it('should respect config depth setting', async () => {
      const { fileExists, readText } = await import('../../src/utils/fs.js');
      const { getVerificationPrompt } = await import(
        '../../src/templates/system-prompt.js'
      );
      const { ClaudeClient } = await import(
        '../../src/services/claude-client.js'
      );

      // Ensure client is available
      (ClaudeClient as any).mockImplementation(() => ({
        isAvailable: vi.fn().mockResolvedValue(true),
        executeNonInteractive: vi.fn().mockResolvedValue('Mock Claude output'),
      }));

      (fileExists as any).mockResolvedValue(true);
      (readText as any).mockResolvedValue('✅ VERIFIED COMPLETE');

      // Service uses 'standard' depth from mockConfig
      await service.verify(mockWorkspace);

      expect(getVerificationPrompt).toHaveBeenCalledWith(
        'test-workspace',
        expect.any(String),
        expect.any(String),
        'loop',
        'standard'
      );
    });

    it('should allow depth override via options', async () => {
      const { fileExists, readText } = await import('../../src/utils/fs.js');
      const { getVerificationPrompt } = await import(
        '../../src/templates/system-prompt.js'
      );
      const { ClaudeClient } = await import(
        '../../src/services/claude-client.js'
      );

      // Ensure client is available
      (ClaudeClient as any).mockImplementation(() => ({
        isAvailable: vi.fn().mockResolvedValue(true),
        executeNonInteractive: vi.fn().mockResolvedValue('Mock Claude output'),
      }));

      (fileExists as any).mockResolvedValue(true);
      (readText as any).mockResolvedValue('✅ VERIFIED COMPLETE');

      await service.verify(mockWorkspace, { depth: 'deep' });

      expect(getVerificationPrompt).toHaveBeenCalledWith(
        'test-workspace',
        expect.any(String),
        expect.any(String),
        'loop',
        'deep'
      );
    });
  });

  describe('parseVerificationReport()', () => {
    it('should parse VERIFIED COMPLETE status', () => {
      const report = `
# Verification Report

## Summary

All tasks complete.

✅ VERIFIED COMPLETE

**Confidence Level**: High
**Recommended Action**: Mark complete
      `;

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.status).toBe('pass');
      expect(result.confidence).toBe('high');
      expect(result.recommendedAction).toBe('Mark complete');
      expect(result.reportPath).toBe('/path/to/report.md');
    });

    it('should parse INCOMPLETE status', () => {
      const report = `
# Verification Report

## Summary

Work incomplete.

❌ INCOMPLETE

**Confidence Level**: Low
**Recommended Action**: Resume work
      `;

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.status).toBe('fail');
      expect(result.confidence).toBe('low');
      expect(result.recommendedAction).toBe('Resume work');
    });

    it('should parse NEEDS REVIEW status (default)', () => {
      const report = `
# Verification Report

## Summary

Status unclear.

**Confidence Level**: Medium
**Recommended Action**: Manual review
      `;

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.status).toBe('needs_review');
      expect(result.confidence).toBe('medium');
      expect(result.recommendedAction).toBe('Manual review');
    });

    it('should extract issue count and issues', () => {
      const report = `
# Verification Report

### Incomplete Requirements

1. **Task A**: Missing implementation
2. **Task B**: Incomplete tests
3. **Task C**: No documentation
      `;

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.issueCount).toBe(3);
      expect(result.issues).toContain('Task A');
      expect(result.issues).toContain('Task B');
      expect(result.issues).toContain('Task C');
    });

    it('should handle reports with no issues', () => {
      const report = `
# Verification Report

## Summary

All complete.

✅ VERIFIED COMPLETE
      `;

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.issueCount).toBe(0);
      expect(result.issues).toEqual([]);
    });

    it('should extract summary from report', () => {
      const report = `
# Verification Report

## Summary

This is the summary text.

✅ VERIFIED
      `;

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.summary).toBe('This is the summary text.');
    });

    it('should use fallback summary if not found', () => {
      const report = `
# Verification Report

No summary section here.

✅ VERIFIED
      `;

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.summary).toBe('See report for details');
    });

    it('should include full report in result', () => {
      const report = '# Full Report Content\n\nDetailed info...';

      const result = (service as any).parseVerificationReport(
        report,
        '/path/to/report.md'
      );

      expect(result.fullReport).toBe(report);
    });
  });

  describe('prepareResumeInstructions()', () => {
    it('should create resume instructions with verification context', async () => {
      const verificationResult = {
        status: 'fail' as const,
        summary: 'Some issues',
        fullReport: 'Full report here',
        reportPath: '/path/to/report.md',
        issueCount: 2,
        issues: ['Task 1', 'Task 2'],
        confidence: 'medium' as const,
        recommendedAction: 'Resume work',
      };

      const result = await service.prepareResumeInstructions(
        mockWorkspace,
        verificationResult
      );

      expect(result).toContain('VERIFICATION FINDINGS');
      expect(result).toContain('2 issue(s)');
      expect(result).toContain('/path/to/report.md');
      expect(result).toContain('1. Task 1');
      expect(result).toContain('2. Task 2');
      expect(result).toContain('# Test Instructions');
    });

    it('should handle empty issues list', async () => {
      const verificationResult = {
        status: 'fail' as const,
        summary: 'Some issues',
        fullReport: 'Full report here',
        reportPath: '/path/to/report.md',
        issueCount: 0,
        issues: [],
        confidence: 'low' as const,
        recommendedAction: 'Review',
      };

      const result = await service.prepareResumeInstructions(
        mockWorkspace,
        verificationResult
      );

      expect(result).toContain('See report for details');
    });
  });
});
