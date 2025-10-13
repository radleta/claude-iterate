/**
 * Execution mode enum
 */
export enum ExecutionMode {
  LOOP = 'loop',
  ITERATIVE = 'iterative',
}

/**
 * Mode metadata interface
 */
export interface ModeDefinition {
  id: ExecutionMode;
  name: string;
  description: string;
  defaultMaxIterations: number;
  completionStrategy: 'markers' | 'todo-completion' | 'custom';
}

/**
 * Mode registry - extensibility point for future modes
 */
export const MODE_DEFINITIONS: Record<ExecutionMode, ModeDefinition> = {
  [ExecutionMode.LOOP]: {
    id: ExecutionMode.LOOP,
    name: 'Loop Mode',
    description: 'Incremental iterations with explicit loop awareness',
    defaultMaxIterations: 50,
    completionStrategy: 'markers',
  },
  [ExecutionMode.ITERATIVE]: {
    id: ExecutionMode.ITERATIVE,
    name: 'Iterative Mode',
    description: 'Complete as much work as possible each iteration',
    defaultMaxIterations: 20,
    completionStrategy: 'todo-completion',
  },
};
