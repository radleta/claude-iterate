**What makes good instructions for loop mode?**

Loop mode executes incrementally with numerical progress tracking. When creating or reviewing instructions, aim for these qualities:

1. **Autonomous Execution**: Can Claude follow them without human help during iterations?
2. **State Awareness**: Does it check if TODO.md exists and decide whether to initialize or resume?
3. **Re-runnable & Dynamic**: Are counts calculated from source (not hardcoded)? Can TODO.md be deleted and recreated?
4. **Incremental Progress**: Does it guide completing one logical step per iteration (not rushing through all work)?
5. **Remaining: N Format**: Does TODO.md explicitly use "Remaining: N" countdown format?
6. **Step Sequence**: If order matters, is the sequence clear? If not, is parallel work allowed?
7. **Error Handling**: What happens when individual operations fail? Does it continue with remaining items?
8. **Appropriate Scale**: For 10+ items, is there a batching strategy? Are iteration limits realistic (default: 50)?
9. **Completion Detection**: Is "Remaining: 0" the explicit completion criteria?
10. **No Loop Mentions**: Instructions focus on the task, not iteration mechanics?
11. **Templates Over Examples**: Does it use concrete templates (exact format to copy) rather than abstract examples when showing TODO.md format or file structures?
12. **Relative Links**: Are all file/directory references using relative paths from INSTRUCTIONS.md location (e.g., `working/output.txt`, `TODO.md`) that will work when INSTRUCTIONS.md is the reference point?

**Note on Dynamic Counting:**

- At bootstrap/initialization: Count items from source (files, database, etc.) - never hardcode
- During execution: Work through TODO.md as the source of truth
- On re-runs: If TODO.md deleted or fresh start requested, recount from source
- Bottom line: Instructions should work even if source item count changes between runs
