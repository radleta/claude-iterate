import {
  RuntimeConfig,
  ProjectConfig,
  UserConfig,
  ProjectConfigSchema,
  UserConfigSchema,
  DEFAULT_CONFIG,
} from '../types/config.js';
import { Metadata } from '../types/metadata.js';
import {
  getProjectConfigPath,
  getUserConfigPath,
  resolveTilde,
} from '../utils/paths.js';
import { fileExists, readJson } from '../utils/fs.js';
import { InvalidConfigError } from '../utils/errors.js';

/**
 * Configuration manager with layered config resolution
 * Priority: CLI flags → Workspace config → Project config → User config → Defaults
 */
export class ConfigManager {
  private runtimeConfig: RuntimeConfig;

  private constructor(config: RuntimeConfig) {
    this.runtimeConfig = config;
  }

  /**
   * Load configuration from all sources
   * @param cliOptions Optional CLI options (highest priority)
   * @param workspaceMetadata Optional workspace metadata for workspace-level config
   */
  static async load(
    cliOptions?: {
      workspacesDir?: string;
      templatesDir?: string;
      archiveDir?: string;
      maxIterations?: number;
      delay?: number;
      notifyUrl?: string;
      verbose?: boolean;
      quiet?: boolean;
      output?: string;
      colors?: boolean;
    },
    workspaceMetadata?: Metadata
  ): Promise<ConfigManager> {
    // Start with defaults
    let config: RuntimeConfig = { ...DEFAULT_CONFIG };

    // Layer 1: User config (~/.config/claude-iterate/config.json)
    const userConfig = await ConfigManager.loadUserConfig();
    if (userConfig) {
      config = ConfigManager.mergeUserConfig(config, userConfig);
    }

    // Layer 2: Project config (.claude-iterate.json)
    const projectConfig = await ConfigManager.loadProjectConfig();
    if (projectConfig) {
      config = ConfigManager.mergeProjectConfig(config, projectConfig);
    }

    // Layer 3: Workspace config (from .metadata.json)
    if (workspaceMetadata) {
      config = ConfigManager.mergeWorkspaceConfig(config, workspaceMetadata);
    }

    // Layer 4: CLI options (highest priority)
    if (cliOptions) {
      config = ConfigManager.mergeCliOptions(config, cliOptions);
    }

    // Resolve tilde in paths
    config.workspacesDir = resolveTilde(config.workspacesDir);
    config.templatesDir = resolveTilde(config.templatesDir);
    config.archiveDir = resolveTilde(config.archiveDir);
    config.globalTemplatesDir = resolveTilde(config.globalTemplatesDir);

    return new ConfigManager(config);
  }

  /**
   * Load user config from home directory
   */
  private static async loadUserConfig(): Promise<UserConfig | null> {
    const configPath = getUserConfigPath();

    if (!(await fileExists(configPath))) {
      return null;
    }

    try {
      const data = await readJson<unknown>(configPath);
      return UserConfigSchema.parse(data);
    } catch (error) {
      throw new InvalidConfigError(
        `User config validation failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Load project config from current directory
   */
  private static async loadProjectConfig(): Promise<ProjectConfig | null> {
    const configPath = getProjectConfigPath();

    if (!(await fileExists(configPath))) {
      return null;
    }

    try {
      const data = await readJson<unknown>(configPath);
      return ProjectConfigSchema.parse(data);
    } catch (error) {
      throw new InvalidConfigError(
        `Project config validation failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Merge user config into runtime config
   */
  private static mergeUserConfig(
    config: RuntimeConfig,
    userConfig: UserConfig
  ): RuntimeConfig {
    // Handle backward compatibility: map verbose boolean to outputLevel
    let outputLevel = userConfig.outputLevel;
    if (userConfig.verbose && !userConfig.outputLevel) {
      outputLevel = 'verbose';
    } else if (userConfig.verbose === false && !userConfig.outputLevel) {
      outputLevel = 'progress';
    }

    const merged: RuntimeConfig = {
      ...config,
      globalTemplatesDir: userConfig.globalTemplatesDir,
      maxIterations: userConfig.defaultMaxIterations,
      delay: userConfig.defaultDelay,
      stagnationThreshold: userConfig.defaultStagnationThreshold,
      outputLevel,
      notifyUrl: userConfig.notifyUrl,
      claudeCommand: userConfig.claude.command,
      claudeArgs: userConfig.claude.args,
      colors: userConfig.colors,
      verbose: userConfig.verbose,
    };

    // Merge verification config if present
    if (userConfig.verification) {
      merged.verification = {
        autoVerify:
          userConfig.verification.autoVerify ?? config.verification.autoVerify,
        resumeOnFail:
          userConfig.verification.resumeOnFail ??
          config.verification.resumeOnFail,
        maxAttempts:
          userConfig.verification.maxAttempts ??
          config.verification.maxAttempts,
        reportFilename:
          userConfig.verification.reportFilename ??
          config.verification.reportFilename,
        depth: userConfig.verification.depth ?? config.verification.depth,
        notifyOnVerification:
          userConfig.verification.notifyOnVerification ??
          config.verification.notifyOnVerification,
      };
    }

    return merged;
  }

  /**
   * Merge project config into runtime config
   */
  private static mergeProjectConfig(
    config: RuntimeConfig,
    projectConfig: ProjectConfig
  ): RuntimeConfig {
    const merged: RuntimeConfig = {
      ...config,
      workspacesDir: projectConfig.workspacesDir,
      templatesDir: projectConfig.templatesDir,
      archiveDir: projectConfig.archiveDir,
      maxIterations: projectConfig.defaultMaxIterations,
      delay: projectConfig.defaultDelay,
      stagnationThreshold: projectConfig.defaultStagnationThreshold,
      outputLevel: projectConfig.outputLevel,
      notifyUrl: projectConfig.notifyUrl,
      notifyEvents: projectConfig.notifyEvents,
    };

    // Merge claude config if present (project overrides user)
    if (projectConfig.claude) {
      merged.claudeCommand = projectConfig.claude.command;
      merged.claudeArgs = projectConfig.claude.args;
    }

    // Merge verification config if present (project overrides user)
    if (projectConfig.verification) {
      merged.verification = {
        autoVerify:
          projectConfig.verification.autoVerify ??
          config.verification.autoVerify,
        resumeOnFail:
          projectConfig.verification.resumeOnFail ??
          config.verification.resumeOnFail,
        maxAttempts:
          projectConfig.verification.maxAttempts ??
          config.verification.maxAttempts,
        reportFilename:
          projectConfig.verification.reportFilename ??
          config.verification.reportFilename,
        depth: projectConfig.verification.depth ?? config.verification.depth,
        notifyOnVerification:
          projectConfig.verification.notifyOnVerification ??
          config.verification.notifyOnVerification,
      };
    }

    // Merge notification config if present (project overrides user)
    if (projectConfig.notification?.statusWatch) {
      merged.notification = {
        ...merged.notification,
        statusWatch: {
          enabled: projectConfig.notification.statusWatch.enabled ?? true,
          debounceMs: projectConfig.notification.statusWatch.debounceMs ?? 2000,
          notifyOnlyMeaningful:
            projectConfig.notification.statusWatch.notifyOnlyMeaningful ?? true,
        },
      };
    }

    return merged;
  }

  /**
   * Merge workspace config into runtime config
   * Applies workspace-level overrides from .metadata.json
   */
  private static mergeWorkspaceConfig(
    config: RuntimeConfig,
    metadata: Metadata
  ): RuntimeConfig {
    const merged = { ...config };

    // Backward compat: Top-level execution settings from metadata
    merged.maxIterations = metadata.maxIterations;
    merged.delay = metadata.delay;
    merged.stagnationThreshold = metadata.stagnationThreshold;
    if (metadata.notifyUrl) {
      merged.notifyUrl = metadata.notifyUrl;
    }
    if (metadata.notifyEvents) {
      merged.notifyEvents = metadata.notifyEvents;
    }

    // Workspace config overrides (if present)
    if (metadata.config) {
      // Output level override
      if (metadata.config.outputLevel) {
        merged.outputLevel = metadata.config.outputLevel;
        merged.verbose = metadata.config.outputLevel === 'verbose';
      }

      // Claude settings override
      if (metadata.config.claude) {
        if (metadata.config.claude.command) {
          merged.claudeCommand = metadata.config.claude.command;
        }
        if (metadata.config.claude.args) {
          merged.claudeArgs = metadata.config.claude.args;
        }
      }

      // Verification settings override
      if (metadata.config.verification) {
        merged.verification = {
          depth:
            metadata.config.verification.depth ?? merged.verification.depth,
          autoVerify:
            metadata.config.verification.autoVerify ??
            merged.verification.autoVerify,
          resumeOnFail:
            metadata.config.verification.resumeOnFail ??
            merged.verification.resumeOnFail,
          maxAttempts:
            metadata.config.verification.maxAttempts ??
            merged.verification.maxAttempts,
          reportFilename:
            metadata.config.verification.reportFilename ??
            merged.verification.reportFilename,
          notifyOnVerification:
            metadata.config.verification.notifyOnVerification ??
            merged.verification.notifyOnVerification,
        };
      }
    }

    return merged;
  }

  /**
   * Merge CLI options into runtime config (highest priority)
   */
  private static mergeCliOptions(
    config: RuntimeConfig,
    cliOptions: {
      workspacesDir?: string;
      templatesDir?: string;
      archiveDir?: string;
      maxIterations?: number;
      delay?: number;
      notifyUrl?: string;
      verbose?: boolean;
      quiet?: boolean;
      output?: string;
      colors?: boolean;
    }
  ): RuntimeConfig {
    const merged = { ...config };

    if (cliOptions.workspacesDir !== undefined) {
      merged.workspacesDir = cliOptions.workspacesDir;
    }
    if (cliOptions.templatesDir !== undefined) {
      merged.templatesDir = cliOptions.templatesDir;
    }
    if (cliOptions.archiveDir !== undefined) {
      merged.archiveDir = cliOptions.archiveDir;
    }
    if (cliOptions.maxIterations !== undefined) {
      merged.maxIterations = cliOptions.maxIterations;
    }
    if (cliOptions.delay !== undefined) {
      merged.delay = cliOptions.delay;
    }
    if (cliOptions.notifyUrl !== undefined) {
      merged.notifyUrl = cliOptions.notifyUrl;
    }

    // Handle output level with priority: --output > --verbose/--quiet > config
    if (cliOptions.output !== undefined) {
      if (['quiet', 'progress', 'verbose'].includes(cliOptions.output)) {
        merged.outputLevel = cliOptions.output as
          | 'quiet'
          | 'progress'
          | 'verbose';
        // Also set verbose for backward compatibility
        merged.verbose = cliOptions.output === 'verbose';
      }
    } else if (cliOptions.verbose !== undefined) {
      merged.outputLevel = 'verbose';
      merged.verbose = true;
    } else if (cliOptions.quiet !== undefined) {
      merged.outputLevel = 'quiet';
      merged.verbose = false;
    }

    if (cliOptions.colors !== undefined) {
      merged.colors = cliOptions.colors;
    }

    return merged;
  }

  /**
   * Get runtime configuration
   */
  getConfig(): RuntimeConfig {
    return { ...this.runtimeConfig };
  }

  /**
   * Get specific config value
   */
  get<K extends keyof RuntimeConfig>(key: K): RuntimeConfig[K] {
    return this.runtimeConfig[key];
  }
}
