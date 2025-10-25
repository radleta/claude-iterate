#!/usr/bin/env node

/**
 * Copy necessary files after TypeScript compilation
 * This ensures any additional files are in the right place for distribution
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

/**
 * Recursively copy a directory with optional file filter
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @param {Function|null} filter - Optional filter function(filename) => boolean
 */
function copyDirRecursive(src, dest, filter = null) {
  let copiedCount = 0;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copiedCount += copyDirRecursive(srcPath, destPath, filter);
    } else {
      // Apply filter if provided
      if (filter && !filter(entry.name)) {
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
      copiedCount++;
    }
  }

  return copiedCount;
}

// Copy template files to dist (only .md files, not .ts source files)
const templatesSource = path.join(__dirname, '../src/templates');
const templatesDest = path.join(distDir, 'templates');

let totalCopied = 0;
if (fs.existsSync(templatesSource)) {
  const copiedCount = copyDirRecursive(templatesSource, templatesDest, (filename) => {
    // Only copy .md template files, not .ts source files
    return filename.endsWith('.md');
  });
  console.log(`Copied ${copiedCount} .md template files to dist/templates/`);
  totalCopied += copiedCount;
}

if (totalCopied === 0) {
  console.log('No additional files to copy (this is normal)');
} else {
  console.log(`Build files copied successfully (${totalCopied} files)`);
}
