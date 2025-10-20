import { z } from 'zod';

/**
 * Project config schema (.claude-iterate.json in project root)
 */
export const ProjectConfigSchema = z.object({
  workspacesDir: z.string().default('./claude-iterate/workspaces'),
  templatesDir: z.string().default('./claude-iterate/templates'),
  archiveDir: z.string().default('./claude-iterate/archive'),
  defaultMaxIterations: z.number().int().min(1).default(50),
  defaultDelay: z.number().int().min(0).default(2),
  defaultStagnationThreshold: z.number().int().min(0).default(2),
  outputLevel: z.enum(['quiet', 'progress', 'verbose']).default('progress'),
  notifyUrl: z.string().url().optional(),
  notifyEvents: z
    .array(z.enum(['completion', 'error', 'iteration']))
    .optional(),
  claude: z
    .object({
      command: z.string().default('claude'),
      args: z.array(z.string()).default([]),
    })
    .optional(),
  verification: z
    .object({
      autoVerify: z.boolean().default(false),
      resumeOnFail: z.boolean().default(false),
      maxAttempts: z.number().int().min(1).max(10).default(2),
      reportFilename: z.string().default('verification-report.md'),
      depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
      notifyOnVerification: z.boolean().default(true),
    })
    .optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

/**
 * User config schema (~/.config/claude-iterate/config.json)
 */
export const UserConfigSchema = z.object({
  globalTemplatesDir: z.string().default('~/.config/claude-iterate/templates'),
  defaultMaxIterations: z.number().int().min(1).default(50),
  defaultDelay: z.number().int().min(0).default(2),
  defaultStagnationThreshold: z.number().int().min(0).default(2),
  outputLevel: z.enum(['quiet', 'progress', 'verbose']).default('progress'),
  notifyUrl: z.string().url().optional(),
  claude: z
    .object({
      command: z.string().default('claude'),
      args: z.array(z.string()).default([]),
    })
    .default({}),
  colors: z.boolean().default(true),
  verbose: z.boolean().default(false), // Deprecated - use outputLevel instead
  verification: z
    .object({
      autoVerify: z.boolean().default(false),
      resumeOnFail: z.boolean().default(false),
      maxAttempts: z.number().int().min(1).max(10).default(2),
      reportFilename: z.string().default('verification-report.md'),
      depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
      notifyOnVerification: z.boolean().default(true),
    })
    .optional(),
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
  stagnationThreshold: number;
  outputLevel: 'quiet' | 'progress' | 'verbose';
  notifyUrl?: string;
  notifyEvents?: string[];
  claudeCommand: string;
  claudeArgs: string[];
  colors: boolean;
  verbose: boolean; // Deprecated - use outputLevel instead
  verification: {
    autoVerify: boolean;
    resumeOnFail: boolean;
    maxAttempts: number;
    reportFilename: string;
    depth: 'quick' | 'standard' | 'deep';
    notifyOnVerification: boolean;
  };
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
  stagnationThreshold: 2,
  outputLevel: 'progress',
  claudeCommand: 'claude',
  claudeArgs: [],
  colors: true,
  verbose: false, // Deprecated - use outputLevel instead
  verification: {
    autoVerify: false,
    resumeOnFail: false,
    maxAttempts: 2,
    reportFilename: 'verification-report.md',
    depth: 'standard',
    notifyOnVerification: true,
  },
};
