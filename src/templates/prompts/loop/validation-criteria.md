**Validation Criteria for Loop Mode Instructions**

Loop mode executes incrementally, completing work step by step. Use these **measurable** criteria to assess instruction quality:

## 1. Clear Goal (REQUIRED)

**Definition**: Goal explicitly states what needs to be accomplished with specific deliverables.

**Check**:

- [ ] Goal section or statement exists
- [ ] Uses specific nouns (not vague: "improve quality" → specific: "migrate 10 API endpoints")
- [ ] Describes deliverables (what will exist when done)
- [ ] Includes context (why this matters or what problem it solves)

**Examples**:

- ✅ GOOD: "Create REST API with /users, /auth, /posts endpoints. Each endpoint must handle GET, POST, PUT, DELETE operations."
- ❌ BAD: "Build an API" (what endpoints? what operations?)
- ❌ BAD: "Make the code better" (no specific deliverables)

---

## 2. Work Breakdown (REQUIRED)

**Definition**: Work is broken into discrete, identifiable steps or components.

**Check**:

- [ ] Instructions describe how to break down the work OR provide a list of items
- [ ] Items/steps are specific enough to identify when complete
- [ ] Breakdown supports incremental progress (one item at a time)

**Examples**:

- ✅ GOOD: "Implement each endpoint: 1) /users 2) /auth 3) /posts"
- ✅ GOOD: "For each endpoint: create route handler, add validation, write tests"
- ❌ BAD: "Complete the API" (no breakdown)
- ❌ BAD: "Do the work" (no structure)

---

## 3. Autonomous Execution (REQUIRED)

**Definition**: An AI agent can follow the instructions without human intervention.

**Check**:

- [ ] No placeholders like "ask the user", "get confirmation", "wait for approval"
- [ ] All necessary context provided (file locations, patterns to follow, quality standards)
- [ ] Instructions describe WHAT to do, not require human decisions
- [ ] If investigation needed, instructions say how (e.g., "examine existing endpoints to match pattern")

**Examples**:

- ✅ GOOD: "Follow the pattern from src/api/users.ts for authentication"
- ❌ BAD: "Ask the user what authentication method to use"
- ❌ BAD: "Wait for approval before proceeding"

---

## 4. Progress Tracking Guidance (RECOMMENDED)

**Definition**: Instructions are clear and unambiguous about progress tracking expectations.

**Check** - Instructions should be EITHER:

- [ ] **Explicit/Prescriptive**: Specify exact format and location (e.g., "Create TODO.md with checkboxes, mark completed items with [x]")
- [ ] **Explicitly Flexible**: Give agent clear permission to choose (e.g., "Track progress in whatever format works best for you")
- [ ] Does NOT leave it vague without guidance

**Note**: System uses .status.json for completion detection, but work-in-progress tracking method is up to the instruction designer.

**Examples**:

- ✅ GOOD (Explicit): "Create TODO.md with a checkbox for each endpoint. Mark completed items with [x]. Update after each endpoint."
- ✅ GOOD (Explicitly Flexible): "Track your progress in whatever format works best (TODO.md, .status.json updates, notes, etc.)"
- ❌ BAD (Vague): "Track your progress" (How? Where? What format? Ambiguous for agent)
- ❌ BAD (Vague): "Keep track of what's done" (No guidance on method or format)
- ➖ ACCEPTABLE: No tracking guidance at all (agent decides, but less clear)

---

## 5. Completion Criteria (REQUIRED)

**Definition**: Instructions clearly state when the work is done.

**Check**:

- [ ] Explicit completion statement exists
- [ ] Uses measurable terms: "all X completed", "N items done", "when all endpoints exist and pass tests"
- [ ] Does NOT reference system mechanics ("when complete: true" or "when Remaining: 0")

**Examples**:

- ✅ GOOD: "Work complete when all 3 endpoints implemented, tested, and documented"
- ✅ GOOD: "Task done when all API endpoints handle CRUD operations and tests pass"
- ❌ BAD: "Complete when done" (circular, not measurable)
- ❌ BAD: "When Remaining: 0" (references system mechanics)
- ❌ BAD: No completion criteria stated

---

## 6. Error Handling (RECOMMENDED)

**Definition**: Instructions describe what to do when operations fail.

**Check**:

- [ ] Mentions error scenarios (file not found, compilation fails, test errors, etc.)
- [ ] Provides guidance: skip and continue, fix and retry, document blocker, etc.
- [ ] Clear about when to stop vs continue

**Examples**:

- ✅ GOOD: "If endpoint creation fails, document the error and continue to next endpoint"
- ✅ GOOD: "If tests fail, fix the issue before moving to next item"
- ➖ ACCEPTABLE: No error handling guidance (agent will use judgment)
- ❌ BAD: "Never allow errors" (unrealistic)

---

## 7. Quality Standards (REQUIRED)

**Definition**: Instructions specify what "done" means beyond just completion.

**Check**:

- [ ] Mentions quality requirements (tests, docs, linting, etc.)
- [ ] Quality criteria are measurable: "tests pass", "documented with JSDoc", "linter passes"
- [ ] Clear about minimum acceptable quality

**Examples**:

- ✅ GOOD: "Each endpoint must have tests that pass and be documented with JSDoc"
- ✅ GOOD: "Code must pass linter (npm run lint) and compile without errors"
- ❌ BAD: "Make it good quality" (not measurable)
- ❌ BAD: No quality standards stated

---

## 8. Appropriate Scale (REQUIRED)

**Definition**: Scope is realistic for loop mode execution (incremental, item-by-item progress).

**Check**:

- [ ] Work is broken into discrete steps/items that can be completed incrementally
- [ ] Each step is small enough to make meaningful progress
- [ ] Total scope is achievable (not unrealistically large)
- [ ] Not so small that iteration overhead isn't worthwhile

**Examples**:

- ✅ GOOD: "Create REST API with /users, /auth, /posts endpoints" (discrete items)
- ✅ GOOD: "Migrate functions to TypeScript one at a time" (incremental approach)
- ⚠️ TOO LARGE: "Rewrite entire application from scratch" (too broad, needs decomposition)
- ⚠️ TOO SMALL: "Add one line of code" (use claude directly, not worth iteration overhead)

---

## 9. No System Mechanics (REQUIRED)

**Definition**: Instructions focus on the task, not how claude-iterate works.

**Check**: Instructions do NOT include:

- [ ] "Each iteration, you will be called..."
- [ ] "Loop stops when..." or "System re-invokes you until..."
- [ ] "Between iterations, only TODO.md persists..."
- [ ] "Check Remaining: N" or "Update Remaining: N"
- [ ] Any reference to "iterations", "loops", "re-invocation", "state persistence"

**Examples**:

- ✅ GOOD: "Complete all endpoints. Track progress however works best for you."
- ❌ BAD: "Each iteration, complete one endpoint and update Remaining: N until Remaining: 0"
- ❌ BAD: "You will be called repeatedly until the loop stops"

---

## 10. Flexibility (RECOMMENDED)

**Definition**: Instructions specify clear outcomes and constraints while allowing agent to adapt HOW they achieve them.

**Check**:

- [ ] Clear about WHAT to accomplish (outcomes) and constraints (quality standards, requirements)
- [ ] Flexible about HOW to accomplish it when rigid process isn't necessary
- [ ] Allows investigation and adaptation ("examine existing code to match patterns")
- [ ] Doesn't impose unnecessary rigid processes when flexibility would work

**Note**: Be specific about outcomes and constraints (agent-expert principle), but allow flexibility in approach when appropriate (agent-expert principle #10).

**Examples**:

- ✅ GOOD (Specific outcome + flexibility): "Implement user authentication using OAuth2 or JWT. All tests must pass. Follow the pattern in src/api/users.ts for structure."
  - Clear: what (auth), constraints (OAuth2/JWT, tests pass, match pattern)
  - Flexible: which option, how to structure details, which tools
- ✅ GOOD (Explicit investigation): "Examine existing endpoints to determine the authentication pattern, then apply it consistently to new endpoints."
  - Clear: what to do (investigate then apply)
  - Flexible: agent adapts based on findings
- ❌ TOO RIGID: "Step 1: Run 'npm install passport'. Step 2: Copy these exact 50 lines to src/auth.ts. Step 3: Run 'npm test'." (removes all flexibility, agent can't adapt)
  - Only use rigid processes when necessary (critical security, exact reproduction needed)

---

## Summary Checklist

**REQUIRED criteria (must pass all)**:

- [ ] 1. Clear Goal - specific deliverables stated
- [ ] 2. Work Breakdown - broken into discrete items/steps
- [ ] 3. Autonomous Execution - no human intervention needed
- [ ] 5. Completion Criteria - measurable definition of "done"
- [ ] 7. Quality Standards - measurable quality requirements
- [ ] 8. Appropriate Scale - realistic for incremental, item-by-item execution
- [ ] 9. No System Mechanics - focuses on task, not system implementation

**RECOMMENDED criteria (should pass most)**:

- [ ] 4. Progress Tracking Guidance - clear and unambiguous (explicit format OR explicitly flexible)
- [ ] 6. Error Handling - describes what to do when operations fail
- [ ] 10. Flexibility - clear outcomes/constraints, flexible approach when appropriate

**Assessment**:

- **✅ Ready to execute**: All REQUIRED criteria pass + most RECOMMENDED
- **⚠️ Needs revision**: 1-2 REQUIRED criteria fail OR many RECOMMENDED fail
- **❌ Major issues**: 3+ REQUIRED criteria fail
