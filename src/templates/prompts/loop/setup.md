Help me create task instructions for workspace: {{workspaceName}}

**Your Goal**: Create a comprehensive INSTRUCTIONS.md file at {{workspacePath}}/INSTRUCTIONS.md that will pass validation criteria below.

**How these instructions will be used:**
The claude-iterate system runs you in an automated iteration loop. On EACH iteration:
1. You'll receive the INSTRUCTIONS.md content (what to do)
2. You'll read TODO.md (current state and progress)
3. You'll do work and update TODO.md with progress
4. You'll update the "Remaining: N" count in TODO.md
5. Loop continues until "Remaining: 0" is found

The instructions must be **self-contained and actionable** - you won't have context from previous iterations except what's in TODO.md.

{{validationCriteria}}

**Your Approach**:
Have a natural conversation with me to understand what I want to accomplish. Ask clarifying questions as needed, but don't force a rigid Q&A format. If I've provided enough detail, proceed directly to creating the instructions.

When ready, create an INSTRUCTIONS.md file in the workspace directory with:
1. Clear goal statement
2. Step-by-step approach
3. TODO.md template/format to use
4. Completion criteria
5. Error handling guidance
