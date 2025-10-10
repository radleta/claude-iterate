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

// Files to copy from root to dist after build (if needed)
const filesToCopy = [
  // Add any files that need to be copied to dist here
  // For example: 'templates/some-file.txt'
];

// Ensure dist directory exists
const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy files
let copiedCount = 0;
filesToCopy.forEach(file => {
  const source = path.join(__dirname, '..', file);
  const dest = path.join(distDir, path.basename(file));

  if (fs.existsSync(source)) {
    fs.copyFileSync(source, dest);
    console.log(`Copied ${file} to dist/`);
    copiedCount++;
  }
});

if (copiedCount === 0) {
  console.log('No additional files to copy (this is normal)');
} else {
  console.log(`Build files copied successfully (${copiedCount} files)`);
}
