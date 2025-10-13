**What makes good instructions for iterative mode?**

When creating or reviewing instructions, aim for these qualities:

1. **Clear Goal**: Does it clearly state what needs to be accomplished?
2. **Task Breakdown**: Are tasks broken into completable units?
3. **TODO Format**: Does it specify checkbox format (- [ ] / - [x])?
4. **State Awareness**: Does it check if TODO.md exists and initialize if needed?
5. **Progress Tracking**: Clear how to mark items complete and track progress?
6. **Error Handling**: What happens when individual operations fail?
7. **Completion Criteria**: Clear when the work is done (all checkboxes checked)?
8. **No Loop Mentions**: Instructions focus on the task, not iteration mechanics?

**Note on TODO Management:**
- At bootstrap: Create TODO.md with all items unchecked
- During work: Mark items complete as they're done: - [x]
- Completion: All items marked [x] (or equivalent clear criteria)
- Instructions should work even if TODO.md is deleted and recreated
