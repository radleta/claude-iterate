**Validation Criteria for Iterative Mode Instructions**

Iterative mode executes autonomously in focused work sessions, completing multiple items per iteration. Use these **measurable** criteria to assess instruction quality:

## 1. Clear Goal (REQUIRED)

**Definition**: Goal explicitly states what needs to be accomplished and why.

**Check**:

- [ ] Goal section or statement exists
- [ ] Uses specific nouns (not vague: "improve quality" → specific: "migrate legacy auth to OAuth2")
- [ ] Describes overall outcome (what will exist when done)
- [ ] Includes context or purpose (why this matters, what problem it solves)

**Examples**:

- ✅ GOOD: "Migrate authentication system from custom JWT to OAuth2 using Passport.js. Needed for enterprise SSO requirements."
- ❌ BAD: "Fix auth" (what needs fixing? what's the target state?)
- ❌ BAD: "Work on the codebase" (no specific goal)

---

## 2. Task Breakdown (REQUIRED)

**Definition**: Work is broken into completable, testable units or components.

**Check**:

- [ ] Instructions describe major components/phases OR provide deliverables list
- [ ] Each component is substantial enough for autonomous work session
- [ ] Breakdown is logical and supports parallel or sequential work
- [ ] Clear how components relate or integrate

**Examples**:

- ✅ GOOD: "Migration involves: 1) Passport.js integration 2) OAuth providers config 3) User model updates 4) Frontend login changes 5) Testing"
- ✅ GOOD: "Replace authentication in: API layer, web app, mobile app"
- ❌ BAD: "Do everything at once" (no breakdown)
- ❌ BAD: Overly granular: "Change line 1, then line 2, then line 3..." (use loop mode for this)

---

## 3. Autonomous Execution (REQUIRED)

**Definition**: An AI agent can follow the instructions without human intervention.

**Check**:

- [ ] No placeholders like "ask the user", "get confirmation", "wait for approval"
- [ ] All necessary context provided (architecture, patterns, constraints, quality standards)
- [ ] Instructions describe WHAT to accomplish, not require human decisions mid-work
- [ ] If investigation needed, instructions say how and what to look for

**Examples**:

- ✅ GOOD: "Examine current authentication in src/auth/ to understand patterns, then implement OAuth2 following same architecture"
- ❌ BAD: "Check with the user about which OAuth provider to support"
- ❌ BAD: "Get approval before modifying the database schema"

---

## 4. Progress Tracking Guidance (RECOMMENDED)

**Definition**: Instructions are clear and unambiguous about progress tracking expectations.

**Check** - Instructions should be EITHER:

- [ ] **Explicit/Prescriptive**: Specify exact format and what to track (e.g., "Create TODO.md listing all components. Mark each complete. Note blockers in a Blockers section.")
- [ ] **Explicitly Flexible**: Give agent clear permission to choose (e.g., "Track progress in whatever format works best for you")
- [ ] Does NOT leave it vague without guidance

**Note**: System uses .status.json for completion detection, but work-in-progress tracking method is up to the instruction designer.

**Examples**:

- ✅ GOOD (Explicit): "Maintain a checklist in TODO.md with each component. Mark completed components and note any blockers encountered."
- ✅ GOOD (Explicitly Flexible): "Track your progress through the components in whatever format works best (TODO.md, notes, .status.json updates, etc.)"
- ❌ BAD (Vague): "Track which components are complete" (Where? How? What format? Ambiguous for agent)
- ❌ BAD (Vague): "Note any blockers" (Where? In what format? Ambiguous)
- ➖ ACCEPTABLE: No tracking guidance at all (agent decides, but less clear)

---

## 5. Completion Criteria (REQUIRED)

**Definition**: Instructions clearly state when the work is done.

**Check**:

- [ ] Explicit completion statement exists
- [ ] Uses measurable terms: "when all components migrated", "when tests pass", "when X functional"
- [ ] Describes final state clearly
- [ ] Does NOT reference system mechanics ("when complete: true" or "when iterations stop")

**Examples**:

- ✅ GOOD: "Migration complete when: all auth flows use OAuth2, tests pass, old JWT code removed, documentation updated"
- ✅ GOOD: "Work done when API, web app, and mobile app all authenticate via OAuth2 successfully"
- ❌ BAD: "Done when finished" (circular, not measurable)
- ❌ BAD: "Complete when the session ends" (references system mechanics)
- ❌ BAD: No completion criteria stated

---

## 6. Error Handling (RECOMMENDED)

**Definition**: Instructions describe how to handle failures, blockers, or errors.

**Check**:

- [ ] Mentions potential error scenarios (compilation fails, tests break, dependencies missing, etc.)
- [ ] Provides guidance: document blocker, try alternative approach, skip and continue, etc.
- [ ] Clear about when to stop vs work around issues

**Examples**:

- ✅ GOOD: "If OAuth provider integration fails, document the blocker and continue with other components"
- ✅ GOOD: "If tests break, fix them before moving to next component"
- ➖ ACCEPTABLE: No error handling guidance (agent will use judgment)
- ❌ BAD: "Everything must work perfectly" (unrealistic)

---

## 7. Quality Standards (REQUIRED)

**Definition**: Instructions specify what "done" means beyond just completion.

**Check**:

- [ ] Mentions quality requirements (tests, docs, linting, integration testing, etc.)
- [ ] Quality criteria are measurable: "tests pass", "linter passes", "documented with examples"
- [ ] Clear about minimum acceptable quality
- [ ] Indicates testing strategy if applicable

**Examples**:

- ✅ GOOD: "Each component must: pass unit tests, pass integration tests, be documented, pass linter"
- ✅ GOOD: "Code must compile without errors, pass all existing tests, add tests for new functionality"
- ❌ BAD: "Make it production quality" (not measurable - what does that mean?)
- ❌ BAD: No quality standards stated

---

## 8. Work Scope (REQUIRED)

**Definition**: Scope is appropriate for iterative mode execution (autonomous work sessions).

**Check**:

- [ ] Work is substantial enough to benefit from focused sessions
- [ ] Work can be broken into completable components
- [ ] Total scope is achievable (not unrealistically large)
- [ ] Not so small that iteration overhead isn't worthwhile

**Examples**:

- ✅ GOOD: "Migrate authentication system" (multi-component, substantial work)
- ✅ GOOD: "Refactor data layer to use new ORM" (well-scoped, achievable)
- ⚠️ TOO LARGE: "Rewrite entire application in different framework" (too broad, needs decomposition)
- ⚠️ TOO SMALL: "Change variable name in one file" (use `claude` directly, not worth iteration overhead)

---

## 9. No System Mechanics (REQUIRED)

**Definition**: Instructions focus on the task, not how claude-iterate works.

**Check**: Instructions do NOT include:

- [ ] "Each session, you will be called..."
- [ ] "Work continues until..." or "System re-invokes you until..."
- [ ] "Between sessions, only files persist..."
- [ ] "Check worked: true" or "Update worked: true"
- [ ] Any reference to "iterations", "sessions", "re-invocation", "state persistence"

**Examples**:

- ✅ GOOD: "Complete the authentication migration. Track progress however works best for you."
- ❌ BAD: "Each session, work on multiple components and update worked: true when you've made progress"
- ❌ BAD: "You will be called in sessions until migration is complete"

---

## 10. Flexibility (RECOMMENDED)

**Definition**: Instructions specify clear outcomes and constraints while allowing agent to adapt HOW they achieve them.

**Check**:

- [ ] Clear about WHAT to accomplish (outcomes) and constraints (quality standards, requirements)
- [ ] Flexible about HOW to accomplish it when rigid process isn't necessary
- [ ] Allows investigation and adaptation based on discoveries
- [ ] Permits adjusting approach if initial plan hits blockers
- [ ] Doesn't impose unnecessary rigid processes when flexibility would work

**Note**: Be specific about outcomes and constraints (agent-expert principle), but allow flexibility in approach when appropriate (agent-expert principle #10).

**Examples**:

- ✅ GOOD (Specific outcome + flexibility): "Migrate authentication to OAuth2 using Passport.js. All existing functionality must work. Tests must pass. Examine current implementation in src/auth/ to determine best migration approach."
  - Clear: what (OAuth2 migration), constraints (functionality works, tests pass, use Passport.js)
  - Flexible: how to migrate, order of components, specific implementation details
- ✅ GOOD (Explicit investigation): "Examine current auth implementation to determine dependencies, then migrate components in order that makes sense based on what you find."
  - Clear: what to do (investigate then migrate)
  - Flexible: agent decides order based on findings
- ✅ GOOD (Adaptation permitted): "If approach A encounters blockers, try approach B or document why neither is viable and propose alternative."
  - Clear: outcomes (working solution or documented blockers)
  - Flexible: agent adapts to problems encountered
- ❌ TOO RIGID: "Day 1: Run these 5 commands. Day 2: Edit exactly these files in this order. Day 3: Test using this exact script." (removes all flexibility, agent can't adapt)
  - Only use rigid processes when necessary (critical security, exact reproduction needed, complex setup)

---

## Summary Checklist

**REQUIRED criteria (must pass all)**:

- [ ] 1. Clear Goal - specific outcome and purpose stated
- [ ] 2. Task Breakdown - broken into completable components/phases
- [ ] 3. Autonomous Execution - no human intervention needed
- [ ] 5. Completion Criteria - measurable definition of "done"
- [ ] 7. Quality Standards - measurable quality requirements
- [ ] 8. Work Scope - appropriate for autonomous work sessions
- [ ] 9. No System Mechanics - focuses on task, not system implementation

**RECOMMENDED criteria (should pass most)**:

- [ ] 4. Progress Tracking Guidance - clear and unambiguous (explicit format OR explicitly flexible)
- [ ] 6. Error Handling - describes how to handle failures and blockers
- [ ] 10. Flexibility - clear outcomes/constraints, flexible approach when appropriate

**Assessment**:

- **✅ Ready to execute**: All REQUIRED criteria pass + most RECOMMENDED
- **⚠️ Needs revision**: 1-2 REQUIRED criteria fail OR many RECOMMENDED fail
- **❌ Major issues**: 3+ REQUIRED criteria fail

---

## Notes for Iterative vs Loop Mode

**Iterative mode is best for**:

- Complex tasks requiring sustained focus
- Work where multiple items can be completed per session
- Tasks with dependencies that emerge during investigation
- Situations where parallel or flexible ordering makes sense

**If your task is better suited to loop mode**:

- Highly incremental (do exactly one item at a time)
- Need strict progress counting (item 1/50, 2/50, etc.)
- Simple repetitive operations with clear boundaries

Consider which mode fits the task nature when validating instructions.
