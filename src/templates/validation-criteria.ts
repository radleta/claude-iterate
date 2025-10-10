/**
 * Validation criteria for instructions
 */
export const VALIDATION_CRITERIA = `
**What makes good instructions?**

When creating or reviewing instructions, aim for these qualities:

1. **Autonomous Execution**: Can Claude follow them without human help during iterations?
2. **State Awareness**: Does it check if TODO.md exists and decide whether to initialize or resume?
3. **Re-runnable**: Are counts calculated from source (not hardcoded)? Can TODO.md be deleted and recreated?
4. **Clear TODO.md Format**: Is there an explicit template showing exactly what to track?
5. **Error Handling**: What happens when individual operations fail? Does it continue with other work?
6. **Appropriate Scale**: For 10+ items, is there a batching strategy? Are iteration limits realistic?
7. **Completion Detection**: Is "Remaining: 0" used? Are completion criteria unambiguous?

**Note on Dynamic Counting:**
- At bootstrap/initialization: Count items from source (files, database, etc.) - never hardcode
- During execution: Work through TODO.md as the source of truth
- On re-runs: If TODO.md deleted or fresh start requested, recount from source
- Bottom line: Instructions should work even if source item count changes between runs
`;
