import { z } from 'zod';
import { ExecutionMode } from './mode.js';

/**
 * Project config schema (.claude-iterate.json in project root)
 */
export const ProjectConfigSchema = z.object({
  workspacesDir: z.string().default('./claude-iterate/workspaces'),
  templatesDir: z.string().default('./claude-iterate/templates'),
  archiveDir: z.string().default('./claude-iterate/archive'),
  defaultMaxIterations: z.number().int().min(1).default(50),
  defaultDelay: z.number().int().min(0).default(2),
  defaultMode: z.nativeEnum(ExecutionMode).default(ExecutionMode.LOOP),
  notifyUrl: z.string().url().optional(),
  notifyEvents: z
    .array(z.enum(['completion', 'error', 'iteration']))
    .optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * User config schema (~/.config/claude-iterate/config.json)
 */
export const UserConfigSchema = z.object({
  globalTemplatesDir: z
    .string()
    .default('~/.config/claude-iterate/templates'),
  defaultMaxIterations: z.number().int().min(1).default(50),
  defaultDelay: z.number().int().min(0).default(2),
  defaultMode: z.nativeEnum(ExecutionMode).default(ExecutionMode.LOOP),
  notifyUrl: z.string().url().optional(),
  claude: z
    .object({
      command: z.string().default('claude'),
      args: z.array(z.string()).default(['--dangerously-skip-permissions']),
    })
    .default({}),
  colors: z.boolean().default(true),
  verbose: z.boolean().default(false),
});

export type UserConfig = z.infer<typeof UserConfigSchema>;

/**
 * Combined runtime config (merged from all sources)
 */
export interface RuntimeConfig {
  workspacesDir: string;
  templatesDir: string;
  archiveDir: string;
  globalTemplatesDir: string;
  maxIterations: number;
  delay: number;
  mode: ExecutionMode;
  notifyUrl?: string;
  notifyEvents?: string[];
  claudeCommand: string;
  claudeArgs: string[];
  colors: boolean;
  verbose: boolean;
}

/**
 * Default runtime config
 */
export const DEFAULT_CONFIG: RuntimeConfig = {
  workspacesDir: './claude-iterate/workspaces',
  templatesDir: './claude-iterate/templates',
  archiveDir: './claude-iterate/archive',
  globalTemplatesDir: '~/.config/claude-iterate/templates',
  maxIterations: 50,
  delay: 2,
  mode: ExecutionMode.LOOP,
  claudeCommand: 'claude',
  claudeArgs: ['--dangerously-skip-permissions'],
  colors: true,
  verbose: false,
};
