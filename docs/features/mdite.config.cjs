module.exports = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // mdite Configuration for Spec-Driven Development (SDD)
  // Purpose: Validate documentation graph structure and links
  // Docs: https://github.com/radleta/mdite#configuration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // IMPORTANT: Place this file in your documentation root directory
  //            (the directory containing README.md, .templates/, and this config)
  //            Run mdite commands FROM this directory
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Entry point for documentation graph traversal
  // SDD uses README.md as the root entry point for each feature
  entrypoint: 'README.md',

  // Validation rules (error | warn | off)
  rules: {
    // Critical: Ensure all documentation is reachable from README.md
    // This validates the "Documentation Linking Convention" in SDD
    'orphan-files': 'error',

    // Critical: Detect broken file links (e.g., ./SPEC.md not found)
    // Essential for validating README → SPEC → PLAN → TEST → TODO chain
    'dead-link': 'error',

    // Critical: Detect broken anchor links (e.g., #non-existent-heading)
    // Ensures cross-file references like ./SPEC.md#api-design work
    'dead-anchor': 'error',
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SDD-Specific Configuration
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Unlimited depth: SDD supports recursive subdirectories (feature/features/sub-feature/...)
  // Set to 'unlimited' to traverse the entire documentation tree
  depth: 'unlimited',

  // Exclude patterns: Don't validate these directories
  exclude: [
    // Scratch directory for temporary work
    'scratch/**',

    // Template files should not be validated
    '.templates/**',
    '**/.templates/**',

    // Agent workspaces should be excluded
    'claude-iterate/**',

    // Standard exclusions
    'node_modules/**',
    '.git/**',

    // Don't validate template files with .template extension
    '*.template',
    '**/*.template',
  ],

  // Optional: Validate external links (http/https)
  // Set to 'validate' to check external links, 'warn' to warn only, or 'off' to skip
  // Note: This can slow down validation due to network requests
  // externalLinks: 'off',

  // Performance tuning: Number of concurrent file reads (1-100)
  // Default is 10, increase for faster validation on large codebases
  // maxConcurrency: 20,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Usage Examples (run from this directory)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // Validate entire documentation tree:
  //   mdite lint

  // Validate specific feature (relative path):
  //   mdite lint my-feature/

  // JSON output for CI/CD:
  //   mdite lint --format json

  // Validate only changed files (pre-commit):
  //   mdite lint $(git diff --cached --name-only | grep '\.md$') --depth 1
};
