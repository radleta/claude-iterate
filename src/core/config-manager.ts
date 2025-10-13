import {
  RuntimeConfig,
  ProjectConfig,
  UserConfig,
  ProjectConfigSchema,
  UserConfigSchema,
  DEFAULT_CONFIG,
} from '../types/config.js';
import {
  getProjectConfigPath,
  getUserConfigPath,
  resolveTilde,
} from '../utils/paths.js';
import { fileExists, readJson } from '../utils/fs.js';
import { InvalidConfigError } from '../utils/errors.js';

/**
 * Configuration manager with layered config resolution
 * Priority: CLI flags → Project config → User config → Defaults
 */
export class ConfigManager {
  private runtimeConfig: RuntimeConfig;

  private constructor(config: RuntimeConfig) {
    this.runtimeConfig = config;
  }

  /**
   * Load configuration from all sources
   */
  static async load(cliOptions?: {
    workspacesDir?: string;
    templatesDir?: string;
    archiveDir?: string;
    maxIterations?: number;
    delay?: number;
    notifyUrl?: string;
    verbose?: boolean;
    colors?: boolean;
  }): Promise<ConfigManager> {
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

    // Layer 3: CLI options (highest priority)
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
    return {
      ...config,
      globalTemplatesDir: userConfig.globalTemplatesDir,
      maxIterations: userConfig.defaultMaxIterations,
      delay: userConfig.defaultDelay,
      completionMarkers: userConfig.completionMarkers,
      notifyUrl: userConfig.notifyUrl,
      claudeCommand: userConfig.claude.command,
      claudeArgs: userConfig.claude.args,
      colors: userConfig.colors,
      verbose: userConfig.verbose,
    };
  }

  /**
   * Merge project config into runtime config
   */
  private static mergeProjectConfig(
    config: RuntimeConfig,
    projectConfig: ProjectConfig
  ): RuntimeConfig {
    return {
      ...config,
      workspacesDir: projectConfig.workspacesDir,
      templatesDir: projectConfig.templatesDir,
      archiveDir: projectConfig.archiveDir,
      maxIterations: projectConfig.defaultMaxIterations,
      delay: projectConfig.defaultDelay,
      completionMarkers: projectConfig.completionMarkers,
      notifyUrl: projectConfig.notifyUrl,
      notifyEvents: projectConfig.notifyEvents,
    };
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
    if (cliOptions.verbose !== undefined) {
      merged.verbose = cliOptions.verbose;
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
