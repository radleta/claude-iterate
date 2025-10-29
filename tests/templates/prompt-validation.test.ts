import { describe, expect, test } from 'vitest';
import { readFile } from 'fs/promises';
import { join } from 'path';

describe('Prompt Template Validation', () => {
  const promptsDir = join(__dirname, '../../src/templates/prompts');

  const iterativeSystemPath = join(promptsDir, 'iterative/iteration-system.md');
  const loopSystemPath = join(promptsDir, 'loop/iteration-system.md');

  test('Budget references include purpose education', async () => {
    const iterativeContent = await readFile(iterativeSystemPath, 'utf-8');
    const loopContent = await readFile(loopSystemPath, 'utf-8');

    // Check for budget purpose education sections
    const purposePattern =
      /Budget Purpose:|WHY|Context Window Management Purpose:/i;

    expect(iterativeContent).toMatch(purposePattern);
    expect(loopContent).toMatch(purposePattern);

    // Should mention quality preservation, state management, or resumption
    const purposeKeywords =
      /quality preservation|state management|clean resumption/i;

    expect(iterativeContent).toMatch(purposeKeywords);
    expect(loopContent).toMatch(purposeKeywords);
  });

  test('No standalone percentage stop thresholds', async () => {
    const iterativeContent = await readFile(iterativeSystemPath, 'utf-8');
    const loopContent = await readFile(loopSystemPath, 'utf-8');

    // Find lines with "stop when" or "completion criteria" followed by percentage
    // but NOT within phase context
    const lines = iterativeContent.split('\n').concat(loopContent.split('\n'));

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      // Skip phase context lines (these are OK)
      if (lowerLine.includes('phase 1') || lowerLine.includes('phase 2')) {
        continue;
      }

      // Check for problematic standalone threshold patterns
      const hasStopLanguage =
        lowerLine.includes('stop when') ||
        lowerLine.includes('completion criteria') ||
        lowerLine.includes("you've used");

      const hasPercentage = /\d+[-~]?\d*%/.test(line);

      if (hasStopLanguage && hasPercentage && !lowerLine.includes('wrap-up')) {
        // This is a problematic standalone percentage threshold
        expect.fail(
          `Found standalone percentage threshold without phase context: "${line.trim()}"`
        );
      }
    }
  });

  test('Phase structure present', async () => {
    const iterativeContent = await readFile(iterativeSystemPath, 'utf-8');
    const loopContent = await readFile(loopSystemPath, 'utf-8');

    // Check for Phase 1 and Phase 2 or work phase and wrap-up phase
    const phase1Pattern = /Phase 1|work phase/i;
    const phase2Pattern = /Phase 2|wrap-up phase/i;

    expect(iterativeContent).toMatch(phase1Pattern);
    expect(iterativeContent).toMatch(phase2Pattern);

    expect(loopContent).toMatch(phase1Pattern);
    expect(loopContent).toMatch(phase2Pattern);
  });

  test('Token replacement syntax valid', async () => {
    const allPromptFiles = [
      join(promptsDir, 'iterative/iteration-system.md'),
      join(promptsDir, 'iterative/iteration.md'),
      join(promptsDir, 'iterative/setup.md'),
      join(promptsDir, 'loop/iteration-system.md'),
      join(promptsDir, 'loop/iteration.md'),
      join(promptsDir, 'loop/setup.md'),
    ];

    const validTokens = [
      'projectRoot',
      'workspacePath',
      'instructionsContent',
      'workspaceName',
      'validationCriteria',
    ];

    for (const filePath of allPromptFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');

        // Find all {{token}} patterns
        const tokenPattern = /\{\{([^}]+)\}\}/g;
        const matches = content.matchAll(tokenPattern);

        for (const match of matches) {
          const token = match[1];

          if (!validTokens.includes(token)) {
            expect.fail(
              `Unknown token {{${token}}} found in ${filePath}. Valid tokens: ${validTokens.join(', ')}`
            );
          }
        }
      } catch (error) {
        // File might not exist yet, skip
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }
    }
  });

  test('No vague terms in completion criteria', async () => {
    const iterativeContent = await readFile(iterativeSystemPath, 'utf-8');
    const loopContent = await readFile(loopSystemPath, 'utf-8');

    // Find completion criteria sections
    const extractCompletionSection = (content: string): string => {
      const lines = content.split('\n');
      const startIdx = lines.findIndex(
        (line) =>
          line.toLowerCase().includes('completion criteria') ||
          line.toLowerCase().includes('stop when')
      );

      if (startIdx === -1) return '';

      // Get next 200 lines or until next major heading
      const endIdx = lines.findIndex(
        (line, idx) => idx > startIdx && line.startsWith('##')
      );

      const sectionLines = lines.slice(
        startIdx,
        endIdx === -1 ? startIdx + 200 : endIdx
      );
      return sectionLines.join('\n');
    };

    const iterativeCompletion = extractCompletionSection(iterativeContent);
    const loopCompletion = extractCompletionSection(loopContent);

    // Check for vague terms
    const vaguemTerms =
      /\b(appropriate|sufficient|good|proper|clearly|meaningful)\b/gi;

    const iterativeMatches = iterativeCompletion.match(vaguemTerms);
    const loopMatches = loopCompletion.match(vaguemTerms);

    if (iterativeMatches) {
      expect.fail(
        `Vague terms found in iterative completion criteria: ${iterativeMatches.join(', ')}`
      );
    }

    if (loopMatches) {
      expect.fail(
        `Vague terms found in loop completion criteria: ${loopMatches.join(', ')}`
      );
    }
  });

  test('Budget framed as reserve not threshold', async () => {
    const iterativeContent = await readFile(iterativeSystemPath, 'utf-8');
    const loopContent = await readFile(loopSystemPath, 'utf-8');

    // Check for "reserve" keyword near budget mentions
    const hasReserveFraming = (content: string): boolean => {
      // Look for "reserve" within context of budget/tokens/context
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();
        const nextLines = lines
          .slice(i, Math.min(i + 5, lines.length))
          .join(' ')
          .toLowerCase();

        // If line mentions budget/context/tokens, check if reserve is nearby
        if (
          (line.includes('budget') ||
            line.includes('context') ||
            line.includes('token')) &&
          nextLines.includes('reserve')
        ) {
          return true;
        }
      }

      return false;
    };

    expect(hasReserveFraming(iterativeContent)).toBe(true);
    expect(hasReserveFraming(loopContent)).toBe(true);

    // Also check for forbidden threshold language without phase context
    const forbiddenPattern = /\bstop (at|when).*?\d+%/gi;

    const iterativeLines = iterativeContent.split('\n');
    const loopLines = loopContent.split('\n');

    for (const line of iterativeLines) {
      if (
        forbiddenPattern.test(line) &&
        !line.toLowerCase().includes('phase')
      ) {
        expect.fail(
          `Found threshold language without phase context in iterative: "${line.trim()}"`
        );
      }
    }

    for (const line of loopLines) {
      if (
        forbiddenPattern.test(line) &&
        !line.toLowerCase().includes('phase')
      ) {
        expect.fail(
          `Found threshold language without phase context in loop: "${line.trim()}"`
        );
      }
    }
  });
});
