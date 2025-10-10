import { beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Global test setup and teardown
 */

let testDir: string | null = null;

/**
 * Create temporary test directory before each test
 */
beforeEach(async () => {
  // Create unique test directory
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  testDir = join(tmpdir(), `claude-iterate-test-${timestamp}-${random}`);

  await fs.mkdir(testDir, { recursive: true });

  // Set as environment variable for tests to use
  process.env['TEST_DIR'] = testDir;
});

/**
 * Clean up test directory after each test
 */
afterEach(async () => {
  if (testDir) {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    testDir = null;
  }

  delete process.env['TEST_DIR'];
});

/**
 * Get current test directory
 */
export function getTestDir(): string {
  if (!testDir) {
    throw new Error('Test directory not initialized');
  }
  return testDir;
}

/**
 * Create test workspace directory
 */
export async function createTestWorkspace(name: string): Promise<string> {
  const dir = getTestDir();
  const workspacePath = join(dir, 'workspaces', name);
  await fs.mkdir(workspacePath, { recursive: true });
  return workspacePath;
}

/**
 * Create test template directory
 */
export async function createTestTemplate(name: string): Promise<string> {
  const dir = getTestDir();
  const templatePath = join(dir, 'templates', name);
  await fs.mkdir(templatePath, { recursive: true });
  return templatePath;
}

/**
 * Write test file
 */
export async function writeTestFile(path: string, content: string): Promise<void> {
  await fs.mkdir(join(path, '..'), { recursive: true });
  await fs.writeFile(path, content, 'utf-8');
}

/**
 * Read test file
 */
export async function readTestFile(path: string): Promise<string> {
  return await fs.readFile(path, 'utf-8');
}
