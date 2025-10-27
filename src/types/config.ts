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
    .array(z.enum(['completion', 'error', 'iteration', 'status_update', 'all']))
    .default(['all']),
  notification: z
    .object({
      statusWatch: z
        .object({
          enabled: z.boolean().default(true),
          debounceMs: z.number().int().min(500).max(10000).default(2000),
          notifyOnlyMeaningful: z.boolean().default(true),
        })
        .optional(),
    })
    .optional(),
  claude: z
    .object({
      command: z.string().default('claude'),
      args: z.array(z.string()).default([]),
    })
    .default({}),
  verification: z
    .object({
      autoVerify: z.boolean().default(true),
      resumeOnFail: z.boolean().default(true),
      maxAttempts: z.number().int().min(1).max(10).default(2),
      reportFilename: z.string().default('verification-report.md'),
      depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
      notifyOnVerification: z.boolean().default(true),
    })
    .default({}),
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
  verification: z
    .object({
      autoVerify: z.boolean().default(true),
      resumeOnFail: z.boolean().default(true),
      maxAttempts: z.number().int().min(1).max(10).default(2),
      reportFilename: z.string().default('verification-report.md'),
      depth: z.enum(['quick', 'standard', 'deep']).default('standard'),
      notifyOnVerification: z.boolean().default(true),
    })
    .default({}),
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
  notifyEvents: string[];
  notification?: {
    statusWatch?: {
      enabled: boolean;
      debounceMs: number;
      notifyOnlyMeaningful: boolean;
    };
  };
  claudeCommand: string;
  claudeArgs: string[];
  colors: boolean;
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
  notifyEvents: ['all'],
  claudeCommand: 'claude',
  claudeArgs: [],
  colors: true,
  verification: {
    autoVerify: true,
    resumeOnFail: true,
    maxAttempts: 2,
    reportFilename: 'verification-report.md',
    depth: 'standard',
    notifyOnVerification: true,
  },
};
