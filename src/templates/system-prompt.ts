import { VALIDATION_CRITERIA } from './validation-criteria.js';

/**
 * Generate system prompt for workspace operations
 */
export function getWorkspaceSystemPrompt(workspacePath: string): string {
  return `**Execution Context:**

You execute from the project root. The workspace is for task management files only.

**Project root** (current directory): Where actual work files live
  - Source code, docs, config files you'll be editing
  - Access with relative paths from current directory

**Workspace** (${workspacePath}): Task management files only
  - INSTRUCTIONS.md (create/edit here)
  - TODO.md (track progress here)
  - working/ (scratch files)
  - reports/ (outputs)

**File Access Examples:**
  ✅ cat ${workspacePath}/TODO.md (workspace file)
  ✅ mkdir -p ${workspacePath}/reports (workspace directory)
  ✅ Edit docs/frontend-design/pages/login.md (project file)
  ✅ Save report to ${workspacePath}/reports/batch-1.md (workspace file)`;
}

/**
 * Generate system prompt for iteration loop
 */
export function getIterationSystemPrompt(workspacePath: string): string {
  return `**Execution Context:**

You run from the project root in an automated iteration loop.

**State Management:**
You have NO memory of previous iterations except what's written in TODO.md.
The TODO.md file is your ONLY source of state.

**Iteration Protocol:**
1. Read TODO.md for current state
2. Do work according to instructions
3. Update TODO.md with progress
4. Update "Remaining: N" count
5. Loop continues until "Remaining: 0"

**Workspace location:** ${workspacePath}
  - TODO.md is at: ${workspacePath}/TODO.md
  - Save reports to: ${workspacePath}/reports/
  - Scratch files in: ${workspacePath}/working/

**Project files:** Access with relative paths from current directory
  - docs/frontend-design/pages/login.md
  - backend/src/controllers/UserController.cs
  - etc.`;
}

/**
 * Generate setup prompt for creating instructions
 */
export function getSetupPrompt(
  workspaceName: string,
  workspacePath: string
): string {
  return `Help me create task instructions for workspace: ${workspaceName}

**Your Goal**: Create a comprehensive INSTRUCTIONS.md file at ${workspacePath}/INSTRUCTIONS.md that will pass validation criteria below.

**How these instructions will be used:**
The claude-iterate system runs Claude in an automated iteration loop. On EACH iteration:
1. Claude receives the INSTRUCTIONS.md content (what to do)
2. Claude reads TODO.md (current state and progress)
3. Claude does work and updates TODO.md with progress
4. Claude updates the "Remaining: N" count in TODO.md
5. Loop continues until "Remaining: 0" is found

The instructions must be **self-contained and actionable** - Claude won't have context from previous iterations except what's in TODO.md.

${VALIDATION_CRITERIA}

**Your Approach**:
Have a natural conversation with me to understand what I want to accomplish. Ask clarifying questions as needed, but don't force a rigid Q&A format. If I've provided enough detail, proceed directly to creating the instructions.

When ready, create an INSTRUCTIONS.md file in the workspace directory with:
1. Clear goal statement
2. Step-by-step approach
3. TODO.md template/format to use
4. Completion criteria
5. Error handling guidance

Let's begin - what task would you like to automate?`;
}

/**
 * Generate edit prompt for updating instructions
 */
export function getEditPrompt(
  workspaceName: string,
  workspacePath: string
): string {
  return `Let's refine the instructions for workspace: ${workspaceName}

Read the current INSTRUCTIONS.md from: ${workspacePath}/INSTRUCTIONS.md

**Context**: These instructions guide an automated iteration loop where:
1. Each iteration, Claude reads INSTRUCTIONS.md and TODO.md
2. Claude does work and updates TODO.md with progress
3. The loop continues until "Remaining: 0" is found in TODO.md

**Current instructions** are in INSTRUCTIONS.md in the workspace directory.

${VALIDATION_CRITERIA}

**Your Role**:
Review the current INSTRUCTIONS.md and have a conversation with me about what needs to change. Ask questions to understand my concerns or desired improvements. Don't force a rigid format - let the conversation flow naturally.

When we agree on changes, update the INSTRUCTIONS.md file in the workspace directory.

What would you like to improve?`;
}

/**
 * Generate validation prompt for checking instructions
 */
export function getValidationPrompt(
  workspaceName: string,
  reportPath: string,
  workspacePath: string
): string {
  return `Validate the instructions for workspace: ${workspaceName}

Read INSTRUCTIONS.md from: ${workspacePath}/INSTRUCTIONS.md

**Task**: Review the INSTRUCTIONS.md file against the validation criteria below.

${VALIDATION_CRITERIA}

**Your Job**:
1. Read the INSTRUCTIONS.md file from the workspace directory
2. Evaluate it against each of the 7 criteria above
3. Identify strengths and potential issues
4. Provide actionable recommendations for improvement

**Output**:
Create a validation report at: ${reportPath}

The report should include:
- **Status**: ✅ Ready to execute | ⚠️ Needs revision | ❌ Major issues
- **Strengths**: What's working well
- **Issues**: Specific problems found (if any)
- **Recommendations**: How to improve (if needed)
- **Overall Assessment**: Summary of readiness

Be thorough but constructive. The goal is to ensure these instructions will work reliably in an automated iteration loop.`;
}

/**
 * Generate iteration prompt with instructions
 */
export function getIterationPrompt(
  instructionsContent: string,
  iterationNumber: number
): string {
  return `# Task Iteration ${iterationNumber}

${instructionsContent}

---

**Your task now**: Follow the instructions above. Read TODO.md, do the work, update TODO.md with progress.`;
}
