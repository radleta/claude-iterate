import { resolve, join } from 'path';
import { homedir } from 'os';

/**
 * Resolve tilde (~) in paths
 */
export function resolveTilde(path: string): string {
  if (path.startsWith('~/') || path === '~') {
    return join(homedir(), path.slice(2));
  }
  return path;
}

/**
 * Resolve path relative to CWD
 */
export function resolveFromCwd(path: string): string {
  return resolve(process.cwd(), resolveTilde(path));
}

/**
 * Get current working directory
 */
export function getCwd(): string {
  return process.cwd();
}

/**
 * Get user home directory
 */
export function getHomeDir(): string {
  return homedir();
}

/**
 * Get user config directory
 */
export function getUserConfigDir(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    return join(process.env['APPDATA'] || join(homedir(), 'AppData', 'Roaming'), 'claude-iterate');
  }

  if (platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'claude-iterate');
  }

  // Linux and others
  return join(
    process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config'),
    'claude-iterate'
  );
}

/**
 * Get project config path (.claude-iterate.json)
 */
export function getProjectConfigPath(): string {
  return join(getCwd(), '.claude-iterate.json');
}

/**
 * Get user config path
 */
export function getUserConfigPath(): string {
  return join(getUserConfigDir(), 'config.json');
}

/**
 * Get workspaces directory path
 */
export function getWorkspacesDir(dir?: string): string {
  if (dir) {
    return resolveFromCwd(dir);
  }
  return resolveFromCwd('./claude-iterate/workspaces');
}

/**
 * Get templates directory path
 */
export function getTemplatesDir(dir?: string): string {
  if (dir) {
    return resolveFromCwd(dir);
  }
  return resolveFromCwd('./claude-iterate/templates');
}

/**
 * Get global templates directory path
 */
export function getGlobalTemplatesDir(): string {
  return join(getUserConfigDir(), 'templates');
}

/**
 * Get archive directory path
 */
export function getArchiveDir(dir?: string): string {
  if (dir) {
    return resolveFromCwd(dir);
  }
  return resolveFromCwd('./claude-iterate/archive');
}

/**
 * Get workspace path
 */
export function getWorkspacePath(name: string, workspacesDir?: string): string {
  return join(getWorkspacesDir(workspacesDir), name);
}

/**
 * Get template path (checks both project and global)
 * Note: Use TemplateManager.findTemplate() for actual template resolution
 */
export function getTemplatePath(
  name: string,
  templatesDir?: string
): { path: string; source: 'project' | 'global' } {
  const projectPath = join(getTemplatesDir(templatesDir), name);
  // Note: For complete resolution including global templates, use TemplateManager

  // Return project path for checking (caller should verify which exists)
  return { path: projectPath, source: 'project' };
}

/**
 * Validate workspace name
 */
export function isValidWorkspaceName(name: string): boolean {
  // No special characters except hyphens and underscores
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * Normalize path separators
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}
