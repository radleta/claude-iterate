import { promises as fs, Dirent } from 'fs';
import { join, dirname } from 'path';
import { FileSystemError } from './errors.js';

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDir(path: string): Promise<void> {
  try {
    await fs.mkdir(path, { recursive: true });
  } catch (error) {
    throw new FileSystemError(
      `Failed to create directory: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * Check if file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if directory exists
 */
export async function dirExists(path: string): Promise<boolean> {
  try {
    const stat = await fs.stat(path);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Read JSON file with type safety
 */
export async function readJson<T>(path: string): Promise<T> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new FileSystemError(
      `Failed to read JSON file: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * Write JSON file with formatting
 */
export async function writeJson<T>(
  path: string,
  data: T,
  pretty: boolean = true
): Promise<void> {
  try {
    await ensureDir(dirname(path));
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await fs.writeFile(path, content + '\n', 'utf-8');
  } catch (error) {
    throw new FileSystemError(
      `Failed to write JSON file: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * Read text file
 */
export async function readText(path: string): Promise<string> {
  try {
    return await fs.readFile(path, 'utf-8');
  } catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * Write text file
 */
export async function writeText(path: string, content: string): Promise<void> {
  try {
    await ensureDir(dirname(path));
    await fs.writeFile(path, content, 'utf-8');
  } catch (error) {
    throw new FileSystemError(
      `Failed to write file: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * Copy file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  try {
    await ensureDir(dirname(dest));
    await fs.copyFile(src, dest);
  } catch (error) {
    throw new FileSystemError(
      `Failed to copy file: ${(error as Error).message}`,
      src
    );
  }
}

/**
 * Remove file or directory recursively
 */
export async function remove(path: string): Promise<void> {
  try {
    await fs.rm(path, { recursive: true, force: true });
  } catch (error) {
    throw new FileSystemError(
      `Failed to remove: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * List directory contents
 */
export async function listDir(path: string): Promise<string[]> {
  try {
    return await fs.readdir(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to list directory: ${(error as Error).message}`,
      path
    );
  }
}

/**
 * Copy directory recursively
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  try {
    await ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    throw new FileSystemError(
      `Failed to copy directory: ${(error as Error).message}`,
      src
    );
  }
}

/**
 * Check if path exists (file or directory)
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy file or directory
 */
export async function copy(src: string, dest: string): Promise<void> {
  try {
    const stat = await fs.stat(src);
    if (stat.isDirectory()) {
      await copyDir(src, dest);
    } else {
      await copyFile(src, dest);
    }
  } catch (error) {
    throw new FileSystemError(
      `Failed to copy: ${(error as Error).message}`,
      src
    );
  }
}

/**
 * Read directory with options
 */
export async function readdir(
  path: string,
  options?: { withFileTypes?: boolean }
): Promise<string[] | Dirent[]> {
  try {
    if (options?.withFileTypes) {
      return await fs.readdir(path, { withFileTypes: true });
    }
    return await fs.readdir(path);
  } catch (error) {
    throw new FileSystemError(
      `Failed to read directory: ${(error as Error).message}`,
      path
    );
  }
}
