Help me create task instructions for workspace: {{workspaceName}}

**Your Goal**: Create a comprehensive INSTRUCTIONS.md file at {{workspacePath}}/INSTRUCTIONS.md that clearly describes the task to complete.

**How these instructions will be used:**
These instructions guide autonomous work sessions. During each session:
1. You'll receive the INSTRUCTIONS.md (what to accomplish)
2. You'll read TODO.md (current task list and progress)
3. You'll complete as many TODO items as possible in one session
4. You'll update TODO.md marking completed items and tracking progress
5. Sessions continue until all work is complete

**Important**: The instructions should focus on WHAT needs to be done, not HOW to iterate. Don't mention iteration loops or "Remaining: N" counts. Focus on the task itself.

{{validationCriteria}}

**Your Approach**:
Have a natural conversation with me to understand what I want to accomplish. Ask clarifying questions as needed, but don't force a rigid Q&A format. If I've provided enough detail, proceed directly to creating the instructions.

When ready, create an INSTRUCTIONS.md file in the workspace directory with:
1. Clear goal statement and context
2. Task breakdown or approach
3. TODO.md format (use checkboxes: - [ ] Item / - [x] Completed)
4. Completion criteria (all checkboxes checked)
5. Quality standards and error handling

Let's begin - what task would you like to accomplish?
