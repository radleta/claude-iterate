import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load and populate a template file with token replacement
 */
export async function loadTemplate(
  templatePath: string,
  tokens: Record<string, string>
): Promise<string> {
  const absolutePath = join(__dirname, '..', 'templates', 'prompts', templatePath);
  let content = await readFile(absolutePath, 'utf-8');

  // Replace all tokens in format {{tokenName}}
  for (const [key, value] of Object.entries(tokens)) {
    const token = `{{${key}}}`;
    content = content.replace(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }

  return content;
}
