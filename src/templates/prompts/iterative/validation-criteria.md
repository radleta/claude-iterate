**What makes good instructions for iterative mode?**

Iterative mode executes autonomously, completing multiple items per session. When creating or reviewing instructions, aim for these qualities:

1. **Clear Goal**: Does it clearly state what needs to be accomplished and why?
2. **Task Breakdown**: Are tasks broken into completable, testable units (not too granular, not too vague)?
3. **Checkbox Format**: Does it specify checkbox format (- [ ] incomplete / - [x] complete)?
4. **State Awareness**: Does it check if TODO.md exists and initialize if needed?
5. **Progress Tracking**: Clear how to mark items complete and update TODO.md after work?
6. **Work Scope Guidance**: Does it provide guidance on how much to tackle per session (avoid "do everything")?
7. **Quality Standards**: Are there clear requirements for code quality, testing, or documentation?
8. **Error Handling**: What happens when individual operations fail? Skip and continue or block progress?
9. **Completion Criteria**: Clear when work is done (all checkboxes checked, tests pass, etc.)?
10. **No System Mentions**: Instructions focus on the task, not work sessions or iteration mechanics?
11. **Templates Over Examples**: Does it use concrete templates (exact format to copy) rather than abstract examples when showing TODO.md format or file structures?
12. **Relative Links**: Are all file/directory references using relative paths from INSTRUCTIONS.md location (e.g., `working/output.txt`, `TODO.md`) that will work when INSTRUCTIONS.md is the reference point?

**Note on TODO Management:**

- At bootstrap: Create TODO.md with all items unchecked
- During work: Mark items complete as they're done: - [x]
- Completion: All items marked [x] (or equivalent clear criteria)
- Instructions should work even if TODO.md is deleted and recreated
