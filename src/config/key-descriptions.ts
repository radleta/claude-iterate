/**
 * Human-readable description for a configuration key
 */
export interface KeyDescription {
  /** Human-readable description of what this key does */
  description: string;

  /** Example value(s) to help users */
  example?: string;

  /** Additional notes, warnings, or tips */
  notes?: string;

  /** Related keys that user might want to know about */
  relatedKeys?: string[];

  /** Category for grouping (paths, execution, notifications, etc.) */
  category?: string;
}

export type DescriptionMap = Record<string, KeyDescription>;

/**
 * Project config descriptions (.claude-iterate.json)
 */
export const PROJECT_CONFIG_DESCRIPTIONS: DescriptionMap = {
  // === PATHS ===
  workspacesDir: {
    description: 'Directory containing all workspace subdirectories',
    example: './my-workspaces',
    category: 'paths',
  },

  templatesDir: {
    description: 'Directory for project-specific templates',
    example: './my-templates',
    category: 'paths',
  },

  archiveDir: {
    description: 'Directory for archived workspaces',
    example: './archive',
    category: 'paths',
  },

  // === EXECUTION ===
  defaultMaxIterations: {
    description: 'Maximum iterations before automatic stop',
    example: '100',
    notes: 'Can be overridden per-workspace or via --max-iterations flag',
    relatedKeys: ['defaultDelay', 'defaultStagnationThreshold'],
    category: 'execution',
  },

  defaultDelay: {
    description: 'Seconds to wait between iterations',
    example: '5',
    notes: 'Set to 0 or use --no-delay to skip delays',
    category: 'execution',
  },

  defaultStagnationThreshold: {
    description:
      'Stop after N consecutive iterations with no work (iterative mode only)',
    example: '3',
    notes: 'Set to 0 to disable stagnation detection',
    category: 'execution',
  },

  outputLevel: {
    description: 'Console output verbosity',
    example: 'verbose',
    notes: 'Options: quiet, progress, verbose',
    category: 'execution',
  },

  // === NOTIFICATIONS ===
  notifyUrl: {
    description: 'HTTP POST endpoint for notifications (ntfy.sh compatible)',
    example: 'https://ntfy.sh/my-topic',
    category: 'notifications',
  },

  notifyEvents: {
    description: 'Which events trigger notifications',
    example: '["completion", "error"]',
    notes:
      'Options: setup_complete, execution_start, iteration, iteration_milestone, completion, error, status_update, all',
    category: 'notifications',
  },

  notification: {
    description: 'Notification configuration options',
    category: 'notifications',
  },

  'notification.statusWatch': {
    description:
      'Status file watcher configuration for real-time notifications',
    category: 'notifications',
  },

  'notification.statusWatch.enabled': {
    description: 'Enable real-time status file monitoring for notifications',
    example: 'false',
    category: 'notifications',
  },

  'notification.statusWatch.debounceMs': {
    description: 'Milliseconds to wait before sending status notifications',
    example: '3000',
    notes: 'Prevents spam during rapid file changes',
    category: 'notifications',
  },

  'notification.statusWatch.notifyOnlyMeaningful': {
    description:
      'Only notify on progress/completion changes (not timestamp updates)',
    example: 'false',
    category: 'notifications',
  },

  // === CLAUDE ===
  claude: {
    description: 'Claude CLI configuration',
    category: 'claude',
  },

  'claude.command': {
    description: 'Claude CLI command name or path',
    example: '/usr/local/bin/claude',
    category: 'claude',
  },

  'claude.args': {
    description: 'Arguments passed to Claude CLI on every invocation',
    example: '["--dangerously-skip-permissions"]',
    notes:
      '⚠️  --dangerously-skip-permissions removes permission prompts. Use only in sandboxed environments.',
    relatedKeys: ['outputLevel'],
    category: 'claude',
  },

  // === VERIFICATION ===
  verification: {
    description: 'Workspace verification configuration',
    category: 'verification',
  },

  'verification.autoVerify': {
    description: 'Automatically verify workspace on claimed completion',
    example: 'true',
    notes: 'Increases token usage but improves quality',
    category: 'verification',
  },

  'verification.resumeOnFail': {
    description: 'Resume iterations if verification fails',
    example: 'true',
    notes: 'Allows Claude to fix incomplete work',
    category: 'verification',
  },

  'verification.maxAttempts': {
    description: 'Maximum verification attempts before giving up',
    example: '3',
    notes: 'Range: 1-10',
    category: 'verification',
  },

  'verification.reportFilename': {
    description: 'Filename for verification reports',
    example: 'my-verification.md',
    category: 'verification',
  },

  'verification.depth': {
    description: 'Verification thoroughness level',
    example: 'deep',
    notes: 'quick: ~500-1K tokens, standard: ~2-4K tokens, deep: ~5-10K tokens',
    category: 'verification',
  },

  'verification.notifyOnVerification': {
    description: 'Send notification when verification completes',
    example: 'false',
    category: 'verification',
  },
};

/**
 * User config descriptions (~/.config/claude-iterate/config.json)
 */
export const USER_CONFIG_DESCRIPTIONS: DescriptionMap = {
  // === PATHS ===
  globalTemplatesDir: {
    description: 'Directory for user-global templates (shared across projects)',
    example: '~/my-templates',
    category: 'paths',
  },

  // === EXECUTION ===
  defaultMaxIterations: {
    description: 'Maximum iterations before automatic stop',
    example: '100',
    category: 'execution',
  },

  defaultDelay: {
    description: 'Seconds to wait between iterations',
    example: '5',
    category: 'execution',
  },

  defaultStagnationThreshold: {
    description:
      'Stop after N consecutive iterations with no work (iterative mode only)',
    example: '3',
    category: 'execution',
  },

  outputLevel: {
    description: 'Console output verbosity',
    example: 'verbose',
    notes: 'Options: quiet, progress, verbose',
    category: 'execution',
  },

  // === DISPLAY ===
  colors: {
    description: 'Enable colored output in terminal',
    example: 'false',
    category: 'display',
  },

  verbose: {
    description: '(Deprecated) Use outputLevel instead',
    example: 'true',
    notes: 'This setting is deprecated. Use outputLevel: "verbose" instead',
    category: 'display',
  },

  // === NOTIFICATIONS ===
  notifyUrl: {
    description: 'HTTP POST endpoint for notifications (ntfy.sh compatible)',
    example: 'https://ntfy.sh/my-topic',
    category: 'notifications',
  },

  // === CLAUDE ===
  claude: {
    description: 'Claude CLI configuration',
    category: 'claude',
  },

  'claude.command': {
    description: 'Claude CLI command name or path',
    example: '/usr/local/bin/claude',
    category: 'claude',
  },

  'claude.args': {
    description: 'Arguments passed to Claude CLI on every invocation',
    example: '["--dangerously-skip-permissions"]',
    notes:
      '⚠️  --dangerously-skip-permissions removes permission prompts. Use only in sandboxed environments.',
    category: 'claude',
  },

  // === VERIFICATION ===
  verification: {
    description: 'Workspace verification configuration',
    category: 'verification',
  },

  'verification.autoVerify': {
    description: 'Automatically verify workspace on claimed completion',
    example: 'true',
    category: 'verification',
  },

  'verification.resumeOnFail': {
    description: 'Resume iterations if verification fails',
    example: 'true',
    category: 'verification',
  },

  'verification.maxAttempts': {
    description: 'Maximum verification attempts before giving up',
    example: '3',
    category: 'verification',
  },

  'verification.reportFilename': {
    description: 'Filename for verification reports',
    example: 'my-verification.md',
    category: 'verification',
  },

  'verification.depth': {
    description: 'Verification thoroughness level',
    example: 'deep',
    notes: 'Options: quick, standard, deep',
    category: 'verification',
  },

  'verification.notifyOnVerification': {
    description: 'Send notification when verification completes',
    example: 'false',
    category: 'verification',
  },
};

/**
 * Workspace config descriptions (.metadata.json)
 */
export const WORKSPACE_CONFIG_DESCRIPTIONS: DescriptionMap = {
  // === VERIFICATION ===
  verification: {
    description: 'Workspace verification configuration overrides',
    notes: 'Settings here override project/user defaults for this workspace',
    category: 'verification',
  },

  'verification.depth': {
    description: 'Verification thoroughness level for this workspace',
    example: 'deep',
    notes: 'Overrides project/user config. Options: quick, standard, deep',
    category: 'verification',
  },

  'verification.autoVerify': {
    description: 'Automatically verify this workspace on claimed completion',
    example: 'true',
    notes: 'Overrides project/user config',
    category: 'verification',
  },

  'verification.resumeOnFail': {
    description: 'Resume iterations if verification fails for this workspace',
    example: 'true',
    notes: 'Overrides project/user config',
    category: 'verification',
  },

  'verification.maxAttempts': {
    description:
      'Maximum verification attempts for this workspace before giving up',
    example: '3',
    notes: 'Overrides project/user config',
    category: 'verification',
  },

  'verification.reportFilename': {
    description: 'Filename for verification reports in this workspace',
    example: 'custom-report.md',
    notes: 'Overrides project/user config',
    category: 'verification',
  },

  'verification.notifyOnVerification': {
    description:
      'Send notification when verification completes for this workspace',
    example: 'false',
    notes: 'Overrides project/user config',
    category: 'verification',
  },

  // === OUTPUT ===
  outputLevel: {
    description: 'Console output verbosity for this workspace',
    example: 'verbose',
    notes: 'Overrides project/user config. Options: quiet, progress, verbose',
    category: 'output',
  },

  // === CLAUDE ===
  claude: {
    description: 'Claude CLI configuration overrides for this workspace',
    notes: 'Settings here override project/user defaults',
    category: 'claude',
  },

  'claude.command': {
    description: 'Claude CLI command name or path for this workspace',
    example: '/usr/local/bin/claude',
    notes: 'Overrides project/user config',
    category: 'claude',
  },

  'claude.args': {
    description: 'Arguments passed to Claude CLI for this workspace',
    example: '["--dangerously-skip-permissions"]',
    notes:
      'Overrides project/user config. ⚠️  --dangerously-skip-permissions removes prompts',
    category: 'claude',
  },
};

/**
 * Get description map for a given scope
 */
export function getDescriptions(
  scope: 'project' | 'user' | 'workspace'
): DescriptionMap {
  switch (scope) {
    case 'project':
      return PROJECT_CONFIG_DESCRIPTIONS;
    case 'user':
      return USER_CONFIG_DESCRIPTIONS;
    case 'workspace':
      return WORKSPACE_CONFIG_DESCRIPTIONS;
    default:
      return {};
  }
}
