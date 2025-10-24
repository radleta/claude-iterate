import { Command } from 'commander';
import { Logger } from '../utils/logger.js';
import {
  getProjectConfigPath,
  getUserConfigPath,
  getWorkspacePath,
} from '../utils/paths.js';
import { fileExists, readJson, writeJson } from '../utils/fs.js';
import { ProjectConfigSchema, UserConfigSchema } from '../types/config.js';
import { Workspace } from '../core/workspace.js';
import { ConfigManager } from '../core/config-manager.js';
import { WorkspaceConfigSchema } from '../types/metadata.js';
import { SchemaInspector } from '../utils/schema-inspector.js';
import {
  ConfigKeysFormatter,
  ConfigKey,
} from '../utils/config-keys-formatter.js';
import { getDescriptions } from '../config/key-descriptions.js';

/**
 * Config command - git-style configuration management
 *
 * Examples:
 *   claude-iterate config --list
 *   claude-iterate config --global --list
 *   claude-iterate config claude.args
 *   claude-iterate config claude.args --add --dangerously-skip-permissions
 *   claude-iterate config --global claude.args --add --dangerously-skip-permissions
 *   claude-iterate config defaultMaxIterations 100
 */
export function configCommand(): Command {
  return new Command('config')
    .description('Get or set configuration values')
    .argument(
      '[key]',
      'Configuration key (use dot notation, e.g., claude.args)'
    )
    .argument('[value]', 'Value to set (omit to get current value)')
    .option('-g, --global', 'Use global user config instead of project config')
    .option('-w, --workspace <name>', 'Manage workspace-level config')
    .option('-l, --list', 'List all configuration values')
    .option('-k, --keys', 'Show available configuration keys')
    .option('--json', 'Output as JSON (for use with --keys)')
    .option('--add <value>', 'Add value to array (for array-type configs)')
    .option(
      '--remove <value>',
      'Remove value from array (for array-type configs)'
    )
    .option('--unset', 'Remove configuration key')
    .action(
      async (
        key: string | undefined,
        value: string | undefined,
        options: {
          global?: boolean;
          workspace?: string;
          list?: boolean;
          keys?: boolean;
          json?: boolean;
          add?: string;
          remove?: string;
          unset?: boolean;
        },
        command: Command
      ) => {
        const logger = new Logger(command.optsWithGlobals().colors !== false);

        try {
          // Handle --keys flag
          if (options.keys) {
            await handleShowKeys(options, logger);
            return;
          }

          // Handle workspace config
          if (options.workspace) {
            await handleWorkspaceConfig(
              options.workspace,
              key,
              value,
              options,
              logger
            );
            return;
          }

          const isGlobal = options.global ?? false;
          const configPath = isGlobal
            ? getUserConfigPath()
            : getProjectConfigPath();
          const scope = isGlobal ? 'global' : 'project';

          // List all configs
          if (options.list) {
            await handleList(configPath, scope, logger);
            return;
          }

          // Key is required for non-list operations
          if (!key) {
            logger.error(
              'Configuration key required. Use --list to see all values.'
            );
            process.exit(1);
          }

          // Get value
          if (!value && !options.add && !options.remove && !options.unset) {
            await handleGet(configPath, key, scope, logger);
            return;
          }

          // Unset value
          if (options.unset) {
            await handleUnset(configPath, key, scope, isGlobal, logger);
            return;
          }

          // Add to array
          if (options.add) {
            await handleArrayAdd(
              configPath,
              key,
              options.add,
              scope,
              isGlobal,
              logger
            );
            return;
          }

          // Remove from array
          if (options.remove) {
            await handleArrayRemove(
              configPath,
              key,
              options.remove,
              scope,
              isGlobal,
              logger
            );
            return;
          }

          // Set value
          if (value) {
            await handleSet(configPath, key, value, scope, isGlobal, logger);
            return;
          }
        } catch (error) {
          logger.error('Configuration operation failed', error as Error);
          process.exit(1);
        }
      }
    );
}

/**
 * Handle workspace configuration
 */
async function handleWorkspaceConfig(
  workspaceName: string,
  key: string | undefined,
  value: string | undefined,
  options: {
    list?: boolean;
    add?: string;
    remove?: string;
    unset?: boolean;
  },
  logger: Logger
): Promise<void> {
  // Load workspace
  const configForPath = await ConfigManager.load({});
  const workspacePath = getWorkspacePath(
    workspaceName,
    configForPath.get('workspacesDir')
  );
  const workspace = await Workspace.load(workspaceName, workspacePath);
  const metadata = await workspace.getMetadata();

  // List
  if (options.list) {
    logger.info(`Workspace Configuration: ${workspaceName}`);
    logger.log(`Path: ${workspace.path}`);
    logger.log('');
    if (metadata.config && Object.keys(metadata.config).length > 0) {
      logger.log(JSON.stringify(metadata.config, null, 2));
    } else {
      logger.log(
        'No workspace-specific configuration (using project/user defaults)'
      );
    }
    return;
  }

  // Key is required for non-list operations
  if (!key) {
    logger.error('Configuration key required. Use --list to see all values.');
    process.exit(1);
  }

  // Get value
  if (!value && !options.add && !options.remove && !options.unset) {
    const dotValue = getNestedValue(metadata.config ?? {}, key);
    if (dotValue !== undefined) {
      logger.log(
        typeof dotValue === 'object'
          ? JSON.stringify(dotValue, null, 2)
          : String(dotValue)
      );
    } else {
      logger.log(`Key '${key}' is not set (using project/user default)`);
    }
    return;
  }

  // Unset value
  if (options.unset) {
    const updatedConfig = { ...metadata.config };
    const removed = unsetNestedValue(updatedConfig, key);

    if (!removed) {
      logger.warn(`Key '${key}' was not set`);
      return;
    }

    await workspace.updateMetadata({ config: updatedConfig });
    logger.success(`Unset workspace config: ${key}`);
    logger.log(`Workspace: ${workspaceName}`);
    return;
  }

  // Add to array
  if (options.add) {
    await handleWorkspaceArrayAdd(
      workspace,
      key,
      options.add,
      workspaceName,
      logger
    );
    return;
  }

  // Remove from array
  if (options.remove) {
    await handleWorkspaceArrayRemove(
      workspace,
      key,
      options.remove,
      workspaceName,
      logger
    );
    return;
  }

  // Set value
  if (value) {
    await handleWorkspaceSet(workspace, key, value, workspaceName, logger);
    return;
  }
}

/**
 * Set a workspace configuration value
 */
async function handleWorkspaceSet(
  workspace: Workspace,
  key: string,
  value: string,
  workspaceName: string,
  logger: Logger
): Promise<void> {
  const metadata = await workspace.getMetadata();
  const config = { ...(metadata.config ?? {}) };

  // Parse value (try number, boolean, then string)
  let parsedValue: unknown = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);

  // Set nested value
  setNestedValue(config, key, parsedValue);

  // Validate with schema
  try {
    WorkspaceConfigSchema.parse(config);
  } catch (error) {
    logger.error(`Invalid workspace config: ${(error as Error).message}`);
    process.exit(1);
  }

  // Save
  await workspace.updateMetadata({ config });

  logger.success(`Set workspace config: ${key} = ${value}`);
  logger.log(`Workspace: ${workspaceName}`);
}

/**
 * Add value to workspace array configuration
 */
async function handleWorkspaceArrayAdd(
  workspace: Workspace,
  key: string,
  value: string,
  workspaceName: string,
  logger: Logger
): Promise<void> {
  const metadata = await workspace.getMetadata();
  const config = { ...(metadata.config ?? {}) };

  // Get current value
  const current = getNestedValue(config, key);

  // Ensure it's an array
  let array: string[];
  if (current === undefined) {
    array = [];
  } else if (Array.isArray(current)) {
    array = current as string[];
  } else {
    logger.error(`Key '${key}' is not an array`);
    process.exit(1);
  }

  // Add value if not already present
  if (array.includes(value)) {
    logger.warn(`Value '${value}' already exists in ${key}`);
    return;
  }

  array.push(value);
  setNestedValue(config, key, array);

  // Validate and save
  try {
    WorkspaceConfigSchema.parse(config);
  } catch (error) {
    logger.error(`Invalid workspace config: ${(error as Error).message}`);
    process.exit(1);
  }

  await workspace.updateMetadata({ config });

  logger.success(`Added to workspace config: ${key} += ${value}`);
  logger.log(`Workspace: ${workspaceName}`);
  logger.log(`Current value: ${JSON.stringify(array)}`);
}

/**
 * Remove value from workspace array configuration
 */
async function handleWorkspaceArrayRemove(
  workspace: Workspace,
  key: string,
  value: string,
  workspaceName: string,
  logger: Logger
): Promise<void> {
  const metadata = await workspace.getMetadata();
  const config = { ...(metadata.config ?? {}) };

  // Get current value
  const current = getNestedValue(config, key);

  // Ensure it's an array
  if (!Array.isArray(current)) {
    logger.error(`Key '${key}' is not an array`);
    process.exit(1);
  }

  const array = current as string[];

  // Remove value
  const index = array.indexOf(value);
  if (index === -1) {
    logger.warn(`Value '${value}' not found in ${key}`);
    return;
  }

  array.splice(index, 1);
  setNestedValue(config, key, array);

  // Save
  await workspace.updateMetadata({ config });

  logger.success(`Removed from workspace config: ${key} -= ${value}`);
  logger.log(`Workspace: ${workspaceName}`);
  logger.log(`Current value: ${JSON.stringify(array)}`);
}

/**
 * List all configuration values
 */
async function handleList(
  configPath: string,
  scope: string,
  logger: Logger
): Promise<void> {
  const exists = await fileExists(configPath);

  if (!exists) {
    logger.warn(`No ${scope} configuration file found`);
    logger.log(`Path: ${configPath}`);
    logger.log('');
    logger.log('To create a config file, set a value:');
    if (scope === 'global') {
      logger.log(
        '  claude-iterate config --global claude.args --add --dangerously-skip-permissions'
      );
    } else {
      logger.log('  claude-iterate config defaultMaxIterations 100');
    }
    return;
  }

  const config = await readJson<unknown>(configPath);

  logger.info(
    `${scope.charAt(0).toUpperCase() + scope.slice(1)} Configuration`
  );
  logger.log(`Path: ${configPath}`);
  logger.log('');
  logger.log(JSON.stringify(config, null, 2));
}

/**
 * Get a configuration value
 */
async function handleGet(
  configPath: string,
  key: string,
  scope: string,
  logger: Logger
): Promise<void> {
  const exists = await fileExists(configPath);

  if (!exists) {
    logger.warn(`No ${scope} configuration file found`);
    logger.log(`Key '${key}' is not set (using default)`);
    return;
  }

  const config = await readJson<Record<string, unknown>>(configPath);
  const dotValue = getNestedValue(config, key);

  if (dotValue === undefined) {
    logger.log(`Key '${key}' is not set (using default)`);
  } else {
    logger.log(
      typeof dotValue === 'object'
        ? JSON.stringify(dotValue, null, 2)
        : String(dotValue)
    );
  }
}

/**
 * Set a configuration value
 */
async function handleSet(
  configPath: string,
  key: string,
  value: string,
  scope: string,
  isGlobal: boolean,
  logger: Logger
): Promise<void> {
  // Load existing config or create new
  let config: Record<string, unknown> = {};
  if (await fileExists(configPath)) {
    config = await readJson<Record<string, unknown>>(configPath);
  }

  // Parse value (try number, boolean, then string)
  let parsedValue: unknown = value;
  if (value === 'true') parsedValue = true;
  else if (value === 'false') parsedValue = false;
  else if (!isNaN(Number(value))) parsedValue = Number(value);

  // Set nested value
  setNestedValue(config, key, parsedValue);

  // Validate and save
  await saveConfig(config, configPath, isGlobal);

  logger.success(`Set ${scope} config: ${key} = ${value}`);
  logger.log(`Path: ${configPath}`);
}

/**
 * Unset (remove) a configuration key
 */
async function handleUnset(
  configPath: string,
  key: string,
  scope: string,
  isGlobal: boolean,
  logger: Logger
): Promise<void> {
  const exists = await fileExists(configPath);

  if (!exists) {
    logger.warn(`No ${scope} configuration file found`);
    logger.log(`Key '${key}' is already unset`);
    return;
  }

  const config = await readJson<Record<string, unknown>>(configPath);

  // Remove nested value
  const removed = unsetNestedValue(config, key);

  if (!removed) {
    logger.warn(`Key '${key}' was not set`);
    return;
  }

  // Save config
  await saveConfig(config, configPath, isGlobal);

  logger.success(`Unset ${scope} config: ${key}`);
  logger.log(`Path: ${configPath}`);
}

/**
 * Add a value to an array configuration
 */
async function handleArrayAdd(
  configPath: string,
  key: string,
  value: string,
  scope: string,
  isGlobal: boolean,
  logger: Logger
): Promise<void> {
  // Load existing config or create new
  let config: Record<string, unknown> = {};
  if (await fileExists(configPath)) {
    config = await readJson<Record<string, unknown>>(configPath);
  }

  // Get current value
  const current = getNestedValue(config, key);

  // Ensure it's an array
  let array: string[];
  if (current === undefined) {
    array = [];
  } else if (Array.isArray(current)) {
    array = current as string[];
  } else {
    logger.error(`Key '${key}' is not an array`);
    process.exit(1);
  }

  // Add value if not already present
  if (array.includes(value)) {
    logger.warn(`Value '${value}' already exists in ${key}`);
    return;
  }

  array.push(value);
  setNestedValue(config, key, array);

  // Validate and save
  await saveConfig(config, configPath, isGlobal);

  logger.success(`Added to ${scope} config: ${key} += ${value}`);
  logger.log(`Path: ${configPath}`);
  logger.log(`Current value: ${JSON.stringify(array)}`);

  // Show warning for dangerous flag
  if (value === '--dangerously-skip-permissions') {
    logger.log('');
    logger.warn('⚠️  You have enabled --dangerously-skip-permissions');
    logger.log('');
    logger.log(
      'This flag disables permission prompts for Claude Code, allowing it to:'
    );
    logger.log('  • Read and write files without confirmation');
    logger.log('  • Execute shell commands without confirmation');
    logger.log('  • Access sensitive data without prompts');
    logger.log('');
    logger.log('Anthropic recommends using this flag "only in a container');
    logger.log('without internet access" to minimize security risks.');
    logger.log('');
    logger.log('Learn more:');
    logger.log(
      '  https://docs.anthropic.com/en/docs/agents/agent-security-model#disabling-permission-prompts'
    );
  }
}

/**
 * Remove a value from an array configuration
 */
async function handleArrayRemove(
  configPath: string,
  key: string,
  value: string,
  scope: string,
  isGlobal: boolean,
  logger: Logger
): Promise<void> {
  const exists = await fileExists(configPath);

  if (!exists) {
    logger.warn(`No ${scope} configuration file found`);
    logger.log(`Key '${key}' is not set`);
    return;
  }

  const config = await readJson<Record<string, unknown>>(configPath);

  // Get current value
  const current = getNestedValue(config, key);

  // Ensure it's an array
  if (!Array.isArray(current)) {
    logger.error(`Key '${key}' is not an array`);
    process.exit(1);
  }

  const array = current as string[];

  // Remove value
  const index = array.indexOf(value);
  if (index === -1) {
    logger.warn(`Value '${value}' not found in ${key}`);
    return;
  }

  array.splice(index, 1);
  setNestedValue(config, key, array);

  // Save config
  await saveConfig(config, configPath, isGlobal);

  logger.success(`Removed from ${scope} config: ${key} -= ${value}`);
  logger.log(`Path: ${configPath}`);
  logger.log(`Current value: ${JSON.stringify(array)}`);
}

/**
 * Get a nested value using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (typeof current !== 'object' || current === null || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested value using dot notation
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split('.');
  const last = parts.pop();

  if (!last) return;

  let current = obj;

  for (const part of parts) {
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[last] = value;
}

/**
 * Unset a nested value using dot notation
 * Returns true if value was removed, false if it didn't exist
 */
function unsetNestedValue(obj: Record<string, unknown>, path: string): boolean {
  const parts = path.split('.');
  const last = parts.pop();

  if (!last) return false;

  let current = obj;

  for (const part of parts) {
    if (!(part in current) || typeof current[part] !== 'object') {
      return false;
    }
    current = current[part] as Record<string, unknown>;
  }

  if (!(last in current)) {
    return false;
  }

  delete current[last];
  return true;
}

/**
 * Save and validate configuration
 */
async function saveConfig(
  config: Record<string, unknown>,
  configPath: string,
  isGlobal: boolean
): Promise<void> {
  // Validate with schema
  if (isGlobal) {
    UserConfigSchema.parse(config);
  } else {
    ProjectConfigSchema.parse(config);
  }

  // Write to file
  await writeJson(configPath, config);
}

/**
 * Handle --keys flag: show available configuration keys
 */
async function handleShowKeys(
  options: {
    global?: boolean;
    workspace?: string;
    json?: boolean;
  },
  logger: Logger
): Promise<void> {
  // Determine scope and schema
  let scope: 'project' | 'user' | 'workspace';
  let schema;

  if (options.workspace) {
    scope = 'workspace';
    // Unwrap the optional wrapper to get the actual object schema
    schema = WorkspaceConfigSchema._def.innerType;
  } else if (options.global) {
    scope = 'user';
    schema = UserConfigSchema;
  } else {
    scope = 'project';
    schema = ProjectConfigSchema;
  }

  // Inspect schema to extract fields
  const inspector = new SchemaInspector();
  const fields = inspector.inspect(schema);

  // Get descriptions for this scope
  const descriptions = getDescriptions(scope);

  // Resolve current values
  const configManager = await ConfigManager.load();
  let workspaceMetadata = null;

  if (options.workspace) {
    try {
      const workspacePath = getWorkspacePath(options.workspace);
      const workspace = new Workspace(options.workspace, workspacePath);
      workspaceMetadata = await workspace['metadataManager'].read();
    } catch (error) {
      // Workspace doesn't exist or can't be loaded - continue without metadata
      logger.debug(
        `Could not load workspace metadata: ${(error as Error).message}`
      );
    }
  }

  const currentValues = await configManager.resolveEffectiveValues(
    scope,
    workspaceMetadata
  );

  // Merge schema fields with descriptions and current values
  const keys: ConfigKey[] = fields.map((field) => ({
    ...field,
    ...descriptions[field.key],
    current: currentValues.get(field.key),
  }));

  // Format output
  if (options.json) {
    const formatter = new ConfigKeysFormatter(logger);
    logger.log(formatter.toJSON(keys, scope));
  } else {
    const formatter = new ConfigKeysFormatter(logger);
    formatter.displayKeys(keys, scope);
  }
}
