import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { MetadataManager } from '../../src/core/metadata.js';
import { Metadata } from '../../src/types/metadata.js';
import { getTestDir, createTestWorkspace } from '../setup.js';

describe('MetadataManager', () => {
  it('should create valid metadata', () => {
    const metadata = MetadataManager.create('test-workspace');

    expect(metadata.name).toBe('test-workspace');
    expect(metadata.status).toBe('in_progress');
    expect(metadata.totalIterations).toBe(0);
    expect(metadata.setupIterations).toBe(0);
    expect(metadata.executionIterations).toBe(0);
    expect(metadata.maxIterations).toBe(50);
    expect(metadata.delay).toBe(2);
    expect(metadata.completionMarkers).toContain('Remaining: 0');
  });

  it('should write and read metadata', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    const metadata = MetadataManager.create('test-workspace');
    await manager.write(metadata);

    const read = await manager.read();
    expect(read.name).toBe('test-workspace');
    expect(read.status).toBe('in_progress');
    expect(read.totalIterations).toBe(0);
  });

  it('should check if metadata exists', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    expect(await manager.exists()).toBe(false);

    const metadata = MetadataManager.create('test-workspace');
    await manager.write(metadata);

    expect(await manager.exists()).toBe(true);
  });

  it('should update metadata fields', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    const metadata = MetadataManager.create('test-workspace');
    await manager.write(metadata);

    const updated = await manager.update({
      status: 'completed',
      totalIterations: 10,
    });

    expect(updated.status).toBe('completed');
    expect(updated.totalIterations).toBe(10);
    expect(updated.name).toBe('test-workspace'); // Other fields preserved
  });

  it('should increment iterations', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    const metadata = MetadataManager.create('test-workspace');
    await manager.write(metadata);

    // Increment setup iterations
    await manager.incrementIterations('setup');
    let current = await manager.read();
    expect(current.totalIterations).toBe(1);
    expect(current.setupIterations).toBe(1);
    expect(current.executionIterations).toBe(0);

    // Increment execution iterations
    await manager.incrementIterations('execution');
    current = await manager.read();
    expect(current.totalIterations).toBe(2);
    expect(current.setupIterations).toBe(1);
    expect(current.executionIterations).toBe(1);
  });

  it('should mark workspace as completed', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    const metadata = MetadataManager.create('test-workspace');
    await manager.write(metadata);

    await manager.markCompleted();
    const current = await manager.read();

    expect(current.status).toBe('completed');
    expect(current.lastRun).toBeDefined();
  });

  it('should mark workspace as error', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    const metadata = MetadataManager.create('test-workspace');
    await manager.write(metadata);

    await manager.markError();
    const current = await manager.read();

    expect(current.status).toBe('error');
  });

  it('should reset iterations', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    const metadata = MetadataManager.create('test-workspace');
    metadata.totalIterations = 100;
    metadata.setupIterations = 50;
    metadata.executionIterations = 50;
    metadata.status = 'completed';
    await manager.write(metadata);

    await manager.resetIterations();
    const current = await manager.read();

    expect(current.totalIterations).toBe(0);
    expect(current.setupIterations).toBe(0);
    expect(current.executionIterations).toBe(0);
    expect(current.status).toBe('in_progress');
  });

  it('should validate metadata on write', async () => {
    const workspacePath = await createTestWorkspace('test-workspace');
    const manager = new MetadataManager(workspacePath);

    const invalidMetadata = {
      name: '', // Invalid: empty name
      created: new Date().toISOString(),
      status: 'in_progress',
    } as Metadata;

    await expect(manager.write(invalidMetadata)).rejects.toThrow();
  });

  it('should get metadata path', () => {
    const workspacePath = join(getTestDir(), 'workspaces', 'test');
    const manager = new MetadataManager(workspacePath);

    expect(manager.getPath()).toBe(join(workspacePath, '.metadata.json'));
  });
});
