import { Workspace } from './workspace.js';
import { ClaudeClient } from '../services/claude-client.js';
import { Logger } from '../utils/logger.js';
import { RuntimeConfig } from '../types/config.js';
import {
  getVerificationPrompt,
  getWorkspaceSystemPrompt,
} from '../templates/system-prompt.js';
import { join, resolve, dirname, isAbsolute } from 'path';
import { mkdir } from 'fs/promises';
import { readText, fileExists } from '../utils/fs.js';

export interface VerificationOptions {
  depth?: 'quick' | 'standard' | 'deep';
  reportPath?: string;
}

export interface VerificationResult {
  status: 'pass' | 'fail' | 'needs_review';
  summary: string;
  fullReport: string;
  reportPath: string;
  issueCount: number;
  issues: string[];
  confidence: 'high' | 'medium' | 'low';
  recommendedAction: string;
}

export class VerificationService {
  constructor(
    private logger: Logger,
    private config: RuntimeConfig
  ) {}

  /**
   * Verify workspace completion
   */
  async verify(
    workspace: Workspace,
    options: VerificationOptions = {}
  ): Promise<VerificationResult> {
    const metadata = await workspace.getMetadata();

    // Determine depth
    const depth = options.depth ?? this.config.verification.depth;

    // Determine report path (ensure absolute)
    let reportPath =
      options.reportPath ??
      join(workspace.path, this.config.verification.reportFilename);

    // Ensure absolute path
    if (!isAbsolute(reportPath)) {
      reportPath = resolve(workspace.path, reportPath);
    }

    this.logger.debug(`Report path (absolute): ${reportPath}`, true);

    // Ensure parent directory exists
    const reportDir = dirname(reportPath);
    try {
      await mkdir(reportDir, { recursive: true });
    } catch (error) {
      // Directory might already exist or be inaccessible
      this.logger.debug(
        `mkdir failed (may be normal): ${error instanceof Error ? error.message : String(error)}`,
        true
      );
    }

    this.logger.info(`Running ${depth} verification...`);

    // Create Claude client
    const client = new ClaudeClient(
      this.config.claudeCommand,
      this.config.claudeArgs,
      this.logger
    );

    // Check Claude availability
    if (!(await client.isAvailable())) {
      throw new Error('Claude CLI not available');
    }

    // Generate prompts (mode-aware)
    const systemPrompt = await getWorkspaceSystemPrompt(workspace.path);
    const prompt = await getVerificationPrompt(
      workspace.name,
      reportPath,
      workspace.path,
      metadata.mode,
      depth
    );

    // Execute verification with diagnostic capture
    let claudeOutput = '';
    try {
      this.logger.debug(`Expecting report at: ${reportPath}`, true);
      claudeOutput = await client.executeNonInteractive(
        prompt,
        systemPrompt,
        undefined,
        {
          onStdout: (chunk) => {
            this.logger.debug(chunk, true);
          },
          onStderr: (chunk) => {
            this.logger.debug(`Claude stderr: ${chunk}`, true);
          },
        }
      );
      this.logger.debug(`Claude completed successfully`, true);
    } catch (error) {
      this.logger.error('Claude execution failed', error as Error);
      throw error;
    }

    // Read generated report with improved error message
    if (!(await fileExists(reportPath))) {
      const errorMsg = [
        'Verification report not generated',
        `Expected location: ${reportPath}`,
        '',
        'This may indicate:',
        '  1. Permission prompts blocked execution',
        '     Try: --dangerously-skip-permissions',
        '  2. Claude failed to understand instructions',
        '  3. Path or permission issues preventing file write',
        '',
        'Claude output:',
        claudeOutput || '(no output captured)',
      ].join('\n');
      throw new Error(errorMsg);
    }

    const fullReport = await readText(reportPath);

    // Parse report for structured result
    const result = this.parseVerificationReport(fullReport, reportPath);

    return result;
  }

  /**
   * Parse verification report into structured result
   */
  private parseVerificationReport(
    report: string,
    reportPath: string
  ): VerificationResult {
    // Extract status from report (look for status markers)
    let status: 'pass' | 'fail' | 'needs_review' = 'needs_review';
    if (
      report.includes('✅ VERIFIED COMPLETE') ||
      report.includes('✅ VERIFIED')
    ) {
      status = 'pass';
    } else if (report.includes('❌ INCOMPLETE')) {
      status = 'fail';
    }

    // Extract summary (first paragraph after "## Summary")
    const summaryMatch = report.match(/## Summary\n\n(.+?)(?=\n\n|$)/s);
    const summary =
      summaryMatch && summaryMatch[1]
        ? summaryMatch[1].trim()
        : 'See report for details';

    // Count issues (look for incomplete items)
    const incompleteSection = report.match(
      /### (?:Incomplete Requirements|Requirements Not Met)(.+?)(?=##|$)/s
    );
    const issueCount =
      incompleteSection && incompleteSection[1]
        ? (incompleteSection[1].match(/^\d+\./gm) || []).length
        : 0;

    // Extract issues list
    const issues: string[] = [];
    if (incompleteSection && incompleteSection[1]) {
      const issueMatches = incompleteSection[1].matchAll(
        /^\d+\.\s*(?:\*\*)?(.+?)(?:\*\*)?:/gm
      );
      for (const match of issueMatches) {
        if (match[1]) {
          issues.push(match[1]);
        }
      }
    }

    // Extract confidence
    const confidenceMatch = report.match(
      /\*\*Confidence Level\*\*: (High|Medium|Low)/
    );
    let confidence: 'high' | 'medium' | 'low' = 'medium';
    if (confidenceMatch && confidenceMatch[1]) {
      const confValue = confidenceMatch[1].toLowerCase();
      if (
        confValue === 'high' ||
        confValue === 'medium' ||
        confValue === 'low'
      ) {
        confidence = confValue;
      }
    }

    // Extract recommended action
    const actionMatch = report.match(
      /\*\*Recommended Action\*\*: (.+?)(?=\n|$)/
    );
    const recommendedAction =
      actionMatch && actionMatch[1] ? actionMatch[1].trim() : 'Manual review';

    return {
      status,
      summary,
      fullReport: report,
      reportPath,
      issueCount,
      issues,
      confidence,
      recommendedAction,
    };
  }

  /**
   * Prepare resume instructions with verification context
   */
  async prepareResumeInstructions(
    workspace: Workspace,
    verificationResult: VerificationResult
  ): Promise<string> {
    const originalInstructions = await workspace.getInstructions();

    const issuesList = verificationResult.issues
      .map((issue, i) => `${i + 1}. ${issue}`)
      .join('\n');

    const resumeContext = `---
**VERIFICATION FINDINGS** (Previous Run)

The previous run claimed completion but verification found ${verificationResult.issueCount} issue(s).

**Verification Report**: ${verificationResult.reportPath}

**Issues to Address**:
${issuesList || 'See report for details'}

**Your Job This Iteration**:
1. Read the full verification report at: ${verificationResult.reportPath}
2. Focus ONLY on the gaps identified above
3. Complete the missing/partial work
4. Update .status.json accurately when done

**Do NOT**:
- Rework items that were verified complete
- Ignore the verification findings
- Mark complete until ALL gaps are addressed

---

${originalInstructions}
`;

    return resumeContext;
  }
}
