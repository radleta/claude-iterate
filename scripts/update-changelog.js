#!/usr/bin/env node

/**
 * Automatically update CHANGELOG.md when version is bumped
 * This script moves "Unreleased" content to a new version section
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Parse version from command line arguments or environment
 */
function parseVersionArgument(argv, env) {
  // Check command line arguments first
  if (argv.length > 2) {
    return argv[2];
  }

  // Check npm_package_version environment variable (set by npm during version hook)
  if (env.npm_package_version) {
    return env.npm_package_version;
  }

  return null;
}

/**
 * Validate version format (semantic versioning)
 */
function isValidVersion(version) {
  // Match semantic versioning: major.minor.patch with optional prerelease/build
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  return semverRegex.test(version);
}

/**
 * Update changelog with new version
 */
function updateChangelog(options) {
  const { changelogPath, version, dryRun = false } = options;

  try {
    // Read changelog
    const changelog = readFileSync(changelogPath, 'utf8');

    // Check if version already exists
    if (changelog.includes(`## [${version}]`)) {
      return {
        success: true,
        skipped: true,
        message: `Version ${version} already exists in CHANGELOG.md - skipping update`,
      };
    }

    // Find [Unreleased] section
    const unreleasedRegex = /## \[Unreleased\]\s*\n([\s\S]*?)(?=\n## \[|$)/;
    const match = changelog.match(unreleasedRegex);

    if (!match) {
      return {
        success: false,
        message: 'Could not find [Unreleased] section in CHANGELOG.md',
      };
    }

    const unreleasedContent = match[1].trim();

    // Check if there's any content to release
    if (!unreleasedContent || unreleasedContent.length === 0) {
      return {
        success: false,
        message: '[Unreleased] section is empty - add changes before releasing',
      };
    }

    // Get current date
    const today = new Date().toISOString().split('T')[0];

    // Create new version section
    const newVersionSection = `## [${version}] - ${today}\n\n${unreleasedContent}\n\n`;

    // Create new [Unreleased] section
    const newUnreleasedSection = `## [Unreleased]\n\n`;

    // Replace [Unreleased] with new [Unreleased] + new version
    const updatedChangelog = changelog.replace(
      unreleasedRegex,
      newUnreleasedSection + newVersionSection
    );

    // Write updated changelog (unless dry run)
    if (!dryRun) {
      writeFileSync(changelogPath, updatedChangelog, 'utf8');
    }

    return {
      success: true,
      skipped: false,
      message: `CHANGELOG.md updated: [Unreleased] content moved to [${version}] - ${today}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to update CHANGELOG.md: ${error.message}`,
    };
  }
}

// Main execution
function main() {
  // Parse version from command line or environment
  const version = parseVersionArgument(process.argv, process.env);

  if (!version) {
    console.error('Error: No version specified');
    console.error('Usage: node update-changelog.js <version>');
    console.error('Or run via npm version script where npm_package_version is available');
    process.exit(1);
  }

  // Validate version format
  if (!isValidVersion(version)) {
    console.error(`Error: Invalid version format: ${version}`);
    console.error('Expected semantic version format (e.g., 1.0.0, 1.0.0-alpha, 1.0.0+build)');
    process.exit(1);
  }

  // Update the changelog
  const changelogPath = join(__dirname, '../CHANGELOG.md');
  const result = updateChangelog({
    changelogPath,
    version,
    dryRun: false,
  });

  if (result.success) {
    if (result.skipped) {
      console.log(`ℹ️  ${result.message}`);
    } else {
      console.log(`✅ ${result.message}`);
    }
  } else {
    console.error(`❌ ${result.message}`);
    process.exit(1);
  }
}

main();
