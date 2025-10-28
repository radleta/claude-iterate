# **How to Contribute a New Feature**

We use a **Spec-Driven Development (SDD)** workflow to build software. This process ensures that all features are clearly defined, reviewed, and planned _before_ any code is written.

Following this process is mandatory. It allows us to collaborate efficiently, reduce ambiguity, and leverage AI agents to accelerate development. This directory structure also serves as a **discoverable registry** of all available features and their capabilities.

> **💡 See Also**
>
> This guide covers **feature documentation** workflow (SPEC/PLAN/TEST/TODO files).
>
> For **code contribution** guidelines (development setup, testing, PR process), see:
>
> - [Root CONTRIBUTING.md](../../CONTRIBUTING.md)

## **The Core Concept: A Single, Scalable Workflow**

There is no "Epic" vs. "Feature." There is **only the Feature**.

A Feature starts simple. If it grows in complexity, it can be broken down by adding a features/ subdirectory to contain _sub-features_. This allows a simple feature to **naturally grow** into an "Epic" without refactoring or changing its location.

## **Key Design Principle: Infinite Recursion**

**The directory name `features/` repeats at every level of the hierarchy—this is intentional.**

You'll see paths like: `docs/features/my-feature/features/sub-feature/features/sub-sub-feature/...`

This recursive naming is not a mistake. It's a powerful design choice that enables:

- **Natural growth:** Any feature can become an "Epic" by simply adding a `features/` subdirectory—no refactoring needed
- **Consistent structure:** The same 5-file pattern (README/SPEC/PLAN/TEST/TODO) works at every level
- **Unlimited depth:** Nest as deeply as needed—there's no arbitrary limit

**Visual Example:**

```
docs/features/auth/                    ← Root feature directory
├── README.md, SPEC.md, PLAN.md, TEST.md, TODO.md
└── features/                          ← Sub-features directory (name repeats!)
    ├── password-reset/
    │   ├── README.md, SPEC.md, PLAN.md, TEST.md, TODO.md
    │   └── features/                  ← Sub-sub-features (name repeats again!)
    │       ├── email-reset/
    │       │   └── README.md, SPEC.md, PLAN.md, TEST.md, TODO.md
    │       └── sms-reset/
    │           └── README.md, SPEC.md, PLAN.md, TEST.md, TODO.md
    └── oauth/
        └── README.md, SPEC.md, PLAN.md, TEST.md, TODO.md
```

Notice how `features/` appears at each level. This pattern continues infinitely—you can nest sub-features within sub-features as deeply as your system requires.

_For detailed examples and implementation guidance, see [Step 3: Handling Growth](#step-3-handling-growth-the-recursive-pattern) below._

## **What is a Feature?**

A **feature** is a discrete unit of functionality in an application that delivers value to end users or enables core business capabilities. Features represent what the application _does_, not how it's organized internally.

### **Characteristics of a Feature**

- **User-Centric**: Addresses a user need or business requirement (directly or indirectly)
- **Value-Delivering**: Provides tangible benefit or capability to users
- **Functionally Complete**: Can be understood and used as a cohesive unit
- **Bounded**: Has clear scope and responsibilities

### **Examples: Features vs. Non-Features**

**✅ These ARE Features:**

- User Authentication - Login, logout, password reset
- Shopping Cart - Add items, update quantities, checkout
- Email Notifications - Send alerts, manage notification preferences
- Product Catalog - Browse, search, filter products
- Order Processing - Place orders, track status, manage fulfillment
- Reporting Dashboard - View metrics, generate reports, export data

**❌ These are NOT Features:**

- Logger utility - Infrastructure component, not user-facing functionality
- Database connection pool - Technical implementation detail
- Config files / Environment variables - Configuration, not a feature
- Shared helper functions (`utils/` folder) - Code organization, not a feature
- CSS framework / UI component library - Foundation layer, not a feature itself

### **Identifying Features in Brownfield Codebases**

**The application type determines what constitutes a feature.** Different application architectures expose features in different ways:

**CLI Applications:**

- Features are commands and their arguments
- Example features: `git commit` (commit changes), `git branch` (manage branches), `git merge` (merge branches)
- Look for: Command definitions, argument parsers, subcommand implementations

**Web Applications:**

- Features are pages, user workflows, and functional areas
- Example features: User Registration, Shopping Cart, Product Search, Admin Dashboard
- Look for: Routes/pages, controllers, views, user-facing workflows

**REST/GraphQL APIs:**

- Features are resource operations and business capabilities
- Example features: User Management, Order Processing, Payment Integration
- Look for: API endpoints grouped by resource (`/api/users`, `/api/orders`), resolvers, services

**Desktop Applications:**

- Features are menu items, windows, and major functionality areas
- Example features: File Management, Text Editing, Print Preview
- Look for: Menu handlers, window/dialog implementations, toolbar actions

**Libraries/SDKs:**

- Features are public APIs and major capabilities
- Example features: Authentication Module, Data Validation, HTTP Client
- Look for: Public classes/functions, documented APIs, capability areas

**When documenting existing code, look for:**

- **User-facing capabilities**: What can users _do_ with this code?
- **Business entities**: Directories/modules organized by domain (e.g., `auth/`, `checkout/`, `notifications/`)
- **Endpoints/Commands**: Entry points users interact with
- **User language**: How users describe the capability ("I want to log in", "I want to commit changes")

**Group related code by what it delivers**, not by technical layer. The `auth/` directory containing login controllers, user models, and session services is one feature: "User Authentication."

### **The Unified Directory Structure**

Every feature, no matter how large or small, has the same core structure:

/my-feature/
├── README.md (The "What" & "Why")
├── SPEC.md (The "How" - The Contract / Architecture)
├── PLAN.md (The "Tasks" - The Implementation Plan)
├── TEST.md (The "Testing" - Test strategy and validation)
├── TODO.md (The "Progress" - Implementation tracking and validation checklist)
└── features/ (Optional: Contains sub-features if this feature is complex)

## **The Workflow: From Idea to Implementation**

You **always** follow this process.

### **Step 1: Create the Feature Directory**

Create a directory for your feature:  
docs/features/{domain_name}/{feature_name}/  
(e.g., docs/features/auth/password-reset/)

### **Step 2: Create the Core Documents**

Inside your new feature directory, create the five core documents.

**Templates Available:** Rich templates with inline guidance are available at `docs/features/.templates/`. Copy and customize these templates to get started quickly:

- `README.md.template` - Feature overview with YAML frontmatter
- `SPEC.md.template` - Technical specification with structured layers (NO testing details)
- `PLAN.md.template` - Implementation plan with task breakdown
- `TEST.md.template` - Testing specification (ALL testing requirements go here)
- `TODO.md.template` - Implementation tracking with validation checklists

#### **1\. README.md (The Feature Brief)**

This document is the **"What"** and **"Why"** of the feature. It is the human-readable entry point.

**Required YAML Frontmatter:**

```yaml
---
# Status Tracking
status: planning | in-progress | blocked | complete
status_summary: Human-readable explanation of current status

# Ownership
owner: username or "agent"

# Blocking Issues
blocked_by: optional link to blocking issue/feature

# Summary (for AI and quick scanning)
summary: One-sentence description of what this feature does
---
```

**Notes on Frontmatter:**

- **No dates:** Git provides complete version history and timestamps. Do not add created/updated dates.
- **Status values:** Use one of the four defined statuses to track feature progress.
- **Summary and status fields:** These make it easy to get a snapshot of each document (README, TODO, PLAN, etc.) for both humans and AI agents scanning the directory.

**Required Contents:**

- **Purpose:** A one-sentence summary.
- **User Stories:** A list of "As a..." statements.
- **Core Business Logic:** Main rules and acceptance criteria.
- **Key Constraints:** Any technical or business rules to follow.
- **Document Links:** Links to SPEC.md, PLAN.md, TEST.md, and TODO.md.

#### **2\. SPEC.md (The Technical Spec)**

This document is the **"Contract"** for the feature. It is the detailed, unambiguous technical blueprint. It **must be reviewed and approved** before any work begins.

**Structured Layers:**

The specification is organized into three layers for clarity:

- **Layer 1: Functional Requirements (What)** - What the feature does from a business/user perspective (user stories, acceptance criteria, business logic)
- **Layer 2: Architecture & Design (How - Language Agnostic)** - How the system is structured at a high level (APIs, data schemas, integration patterns, error handling)
- **Layer 3: Implementation Standards (How - Language Specific)** - Specific technologies, versions, frameworks, documentation standards, security implementation

This layering helps both humans and AI understand the feature at different levels of abstraction.

**Required Contents:**

- **Public Contract / API:** **(For Stability)** If this feature is intended to be used by _other_ features, define its stable, public-facing interface here (e.g., API endpoints, public function signatures).
- **Dependencies:** **(For Composition)** Explicitly list any other features this one depends on. Each dependency MUST be a markdown link to its SPEC.md file (e.g., `[Auth Service](../auth/SPEC.md)`).
  - **Circular dependencies are prohibited.** If you find a circular dependency, extract the shared logic into a third feature that both depend on.
  - **Breaking changes require a new feature.** If a dependency changes its public contract in a breaking way, create a new versioned feature directory (e.g., `auth-v2/`).
- **API Endpoints:** Explicit routes, methods, and request/response schemas.
- **Data Schemas:** Any new or modified database tables.
- **Validation Rules:** Specific rules for all inputs.
- **Error Handling & Edge Cases:** A complete list of all possible errors.
- **Security & Non-Functional Requirements:** (e.g., "Password must be hashed with bcrypt").
- **Visual Aids:** Use Mermaid diagrams to clarify complex flows (sequence diagrams for API interactions, flowcharts for business logic, ER diagrams for data relationships, state diagrams for status transitions).

#### **3\. PLAN.md (The Implementation Plan)**

This document is the **"Task List"** for building the feature. It is generated (by AI or human) from the SPEC.md. It **must be reviewed and approved** before implementation.

**Important:** PLAN.md focuses on implementation tasks only. Do NOT include testing details here - all testing requirements go in TEST.md.

#### **4\. TEST.md (The Testing Specification)**

This document defines **ALL testing requirements** for the feature. Every feature MUST have a TEST.md.

**Required Contents:**

- **Coverage Targets:** Specific percentages for unit, integration, e2e tests (e.g., ">=80% line coverage")
- **Test Scenarios:** What scenarios to test for each testing layer
- **Error Scenarios:** All error conditions and edge cases to test
- **Performance Benchmarks:** Measurable criteria (e.g., "<200ms response time at 95th percentile")
- **Security Testing:** Security-specific test requirements
- **Test Data:** Required test data and setup

**Important:** Do NOT put testing requirements in SPEC.md or PLAN.md. ALL testing details belong in TEST.md.

#### **5\. TODO.md (The Implementation Tracker)**

This document tracks implementation progress and validates feature completion. Every feature MUST have a TODO.md.

**Required Contents (Template Provides Checklist):**

- **Progress Tracking:** Current status and percentage complete
- **Feature Setup Validation:** Checklist verifying all required files exist and are properly structured
- **Implementation Checklist:** Tasks from PLAN.md with completion status
- **Quality Validation:** Checklist for code quality, testing, documentation
- **Blockers:** Any blockers preventing progress

**Default Template:** The TODO.md template provides comprehensive validation checklists to ensure the feature is set up correctly before and during implementation.

### **Step 2.5: Document Structure Guidelines**

**All features require these 5 files:**

- README.md - Feature overview and status
- SPEC.md - Technical specification (NO testing details)
- PLAN.md - Implementation tasks
- TEST.md - ALL testing requirements
- TODO.md - Progress tracking and validation checklists

**PLAN.md Mode Selection:**

**Use Checklist Mode (for leaf features):**

- Relatively few implementation tasks (typically 1-30, but use judgment based on complexity)
- Can be implemented as a cohesive unit
- Single phase implementation

**Use Roadmap Mode (for parent features):**

- Many implementation tasks or high complexity (typically 30+, but use judgment)
- Has multiple distinct, independent parts
- Benefits from parallel development or phased approach
- Multiple teams or long implementation timeline

**When to Split into Subdirectories:**

- SPEC.md exceeds 500 lines → Create `spec/` subdirectory
- PLAN.md exceeds 300 lines → Create `plan/` subdirectory
- TEST.md exceeds 400 lines → Create `test/` subdirectory

**When to Split into Sub-Features:**

Consider creating sub-features when:

- High task count (typically 30+, but evaluate complexity over count)
- Feature has distinct, independent parts that can be developed separately
- Implementation timeline >2 weeks
- Natural logical boundaries exist within the feature

Don't split if:

- Tasks are simple and similar (e.g., many CRUD operations)
- Splitting would create artificial boundaries
- Sub-features would be too small (<5 tasks each)

**How to split:**

- Create features/sub-feature-1/ directory with full 5-file structure
- Parent PLAN.md becomes Roadmap linking to sub-features

### **Step 2.6: Validate Documentation Quality**

Validation ensures your documentation follows SDD standards and catches errors early.

#### **Quick Start**

The validation script and configuration files are included in this directory. To get started:

```bash
# 1. Install validation tools (one-time setup)
npm install -g mdite markdownlint-cli remark-cli remark-frontmatter remark-lint-frontmatter-schema

# 2. Run validation (from this directory)
./validate-docs.sh
```

**Note:** All necessary files are already present:

- `validate-docs.sh` - Validation orchestration script
- `mdite.config.js` - Link and structure validation config
- `.markdownlint.json` - Formatting rules config
- `.markdownlintignore` - Files to exclude from formatting checks
- `.remarkrc.json` - Frontmatter validation config
- `.templates/readme-frontmatter-schema.json` - Frontmatter JSON schema

#### **Validation Tools**

| Tool                               | Purpose                   | Install                                                                       |
| ---------------------------------- | ------------------------- | ----------------------------------------------------------------------------- |
| **mdite**                          | Links, orphans, structure | `npm install -g mdite`                                                        |
| **markdownlint-cli**               | Formatting, style         | `npm install -g markdownlint-cli`                                             |
| **remark-lint-frontmatter-schema** | Frontmatter validation    | `npm install -g remark-cli remark-frontmatter remark-lint-frontmatter-schema` |
| **docsify-cli** (optional)         | Preview server            | `npm install -g docsify-cli`                                                  |

#### **Using validate-docs.sh**

```bash
# Run from this directory
./validate-docs.sh              # Run all validations
./validate-docs.sh --fix        # Auto-fix formatting issues
./validate-docs.sh --quiet      # Summary only
./validate-docs.sh --fast-fail  # Stop on first error
./validate-docs.sh --help       # Show all options
```

**Skip specific checks:**

```bash
./validate-docs.sh --skip-format       # Skip markdownlint
./validate-docs.sh --skip-links        # Skip mdite
./validate-docs.sh --skip-frontmatter  # Skip remark
```

#### **Manual Validation (Fallback)**

Run each tool individually for granular control:

```bash
# From this directory
markdownlint '**/*.md'                                     # Check formatting
markdownlint --fix '**/*.md'                               # Auto-fix formatting
mdite lint                                                 # Validate links/structure
remark '**/README.md' --quiet                              # Validate frontmatter
markdownlint '**/*.md' && mdite lint && remark '**/README.md' --quiet  # All checks
```

#### **What Gets Validated**

**markdownlint:** Formatting (blank lines, line length 120 chars, code block languages, list style)
**mdite:** Links (file links, anchor links), orphan detection, graph structure
**remark:** Frontmatter (required fields, status enum, non-empty strings, blocked_by when blocked)

**Limitations (require custom scripts):**

- 5-file requirement (README, SPEC, PLAN, TEST, TODO)
- Circular dependency detection
- SPEC.md section requirements
- TEST.md coverage targets

#### **Configuration Files**

All configuration files are already present in this directory:

| File                             | Location         | Purpose                       |
| -------------------------------- | ---------------- | ----------------------------- |
| `mdite.config.js`                | (this directory) | mdite rules and exclusions    |
| `.markdownlint.json`             | (this directory) | markdownlint formatting rules |
| `.markdownlintignore`            | (this directory) | Files to exclude from linting |
| `.remarkrc.json`                 | (this directory) | remark frontmatter validation |
| `readme-frontmatter-schema.json` | `.templates/`    | JSON schema for frontmatter   |

All files configured with optimal settings for SDD workflow.

#### **Integration**

**Package.json scripts (repository root, optional):**

```json
{
  "scripts": {
    "validate:docs": "cd docs/features && ./validate-docs.sh",
    "validate:docs:fix": "cd docs/features && ./validate-docs.sh --fix",
    "docs:preview": "cd docs/features && docsify serve ."
  }
}
```

**Note:** Adjust the `cd docs/features` path to match where your documentation root lives (e.g., `cd documentation/features`, `cd features`, etc.).

**Pre-commit hook (repository root, optional):**

```bash
#!/bin/bash
# Adjust path to your documentation root directory
DOC_ROOT="docs/features"

cd "$DOC_ROOT" || exit 1
./validate-docs.sh --fast-fail || exit 1
```

**CI/CD Example:**

```yaml
# .github/workflows/validate-docs.yml
- name: Validate documentation
  run: |
    # Adjust path to your documentation root directory
    cd docs/features
    npm install -g mdite markdownlint-cli remark-cli remark-frontmatter remark-lint-frontmatter-schema
    ./validate-docs.sh --fast-fail --no-color
```

**Live Preview:** `docsify serve .` (from this directory, open http://localhost:3000)

### Step 3: Handling Growth (The Recursive Pattern)

> 💡 **The `features/` directory name repeats at every level—this is intentional!**
>
> You'll see: `my-feature/features/sub-feature/features/sub-sub-feature/...`
>
> This recursive naming enables unlimited nesting without refactoring.

**Key Concept:** A simple feature can naturally grow into an "Epic" by adding a `features/` subdirectory. The same 5-file structure (README/SPEC/PLAN/TEST/TODO) applies at every level, making the structure fully recursive.

**When to Add Sub-Features:**

- Feature has 30+ tasks (too large for single PLAN.md checklist)
- Feature has distinct, independent parts that can be developed separately
- Feature needs to be broken into phases or tracks

**How Recursion Works:**

**Level 0 (Simple Feature):**

```
/my-feature/
├── README.md   (What & Why)
├── SPEC.md     (Contract)
├── PLAN.md     (Task checklist)
├── TEST.md     (Testing requirements)
└── TODO.md     (Progress tracking)
```

**Level 1 (Epic with Sub-Features):**

```
/my-feature/
├── README.md   (What & Why - high level)
├── SPEC.md     (Public contract for entire feature)
├── PLAN.md     (Roadmap linking to sub-features)
├── TEST.md     (Testing strategy)
├── TODO.md     (Progress tracking)
└── **features/**                      ← Directory name: "features"
    ├── sub-feature-1/
    │   ├── README.md   (What & Why - specific)
    │   ├── SPEC.md     (Details for this part)
    │   ├── PLAN.md     (Task checklist)
    │   ├── TEST.md     (Tests for this part)
    │   └── TODO.md     (Progress for this part)
    └── sub-feature-2/
        ├── README.md
        ├── SPEC.md
        ├── PLAN.md
        ├── TEST.md
        └── TODO.md
```

**Level 2+ (Sub-Feature Has Its Own Sub-Features):**

```
/my-feature/
├── README.md
├── SPEC.md
├── PLAN.md (roadmap)
├── TEST.md
├── TODO.md
└── **features/**                      ← "features" at level 1
    └── complex-sub-feature/
        ├── README.md
        ├── SPEC.md
        ├── PLAN.md (roadmap)
        ├── TEST.md
        ├── TODO.md
        └── **features/**              ← "features" at level 2 (name repeats!)
            ├── sub-sub-feature-1/
            │   ├── README.md
            │   ├── SPEC.md
            │   ├── PLAN.md (checklist)
            │   ├── TEST.md
            │   └── TODO.md
            └── sub-sub-feature-2/
                ├── README.md
                ├── SPEC.md
                ├── PLAN.md (checklist)
                ├── TEST.md
                └── TODO.md
```

**The Pattern Repeats Infinitely:**

- Any feature can have a `features/` subdirectory
- Each sub-feature follows the same 5-file structure (README/SPEC/PLAN/TEST/TODO)
- Sub-features can themselves have sub-features
- Eventually, you reach "leaf" features with simple PLAN.md checklists

**Notice how `features/` appears at each level**—you can nest sub-features within sub-features infinitely. There is no depth limit. The directory name repeats by design to maintain a consistent, predictable structure at every level of the hierarchy.

---

**Two PLAN.md Modes:**

**Mode A: Checklist (Leaf Features)**
Used when feature has 1-30 tasks and can be implemented directly:

```markdown
# Implementation Plan

### Phase 1: Database

- [ ] Create migration for `users` table
- [ ] Add indexes on `email` column
- [ ] Write unit tests for queries

### Phase 2: API

- [ ] Create `POST /api/users` endpoint
- [ ] Add validation middleware
- [ ] Write integration tests
```

**Mode B: Roadmap (Parent Features)**
Used when feature is broken into sub-features:

```markdown
# Implementation Plan (Roadmap)

This feature will be implemented as sub-features:

### Phase 1: Core

1. **[Email Auth](./features/email-auth/README.md)** - Email-based authentication
   - Status: Not started
   - Dependencies: None

### Phase 2: Extended

2. **[SMS Auth](./features/sms-auth/README.md)** - SMS-based authentication
   - Status: Not started
   - Dependencies: Email Auth (shares token system)
```

**Rule:** Roadmap PLAN.md files link to sub-features. Checklist PLAN.md files list actual implementation tasks.

---

**Concrete Example:**

Password Reset Feature (Epic):

/password-reset/
├── README.md (Brief: "As a user, I want to reset my password via email OR SMS...")
├── SPEC.md (Spec: High-level architecture, public contract for \*all\* password resets)
├── PLAN.md (Plan: Roadmap linking to the two sub-features)
└── features/
├── email-reset/
│ ├── README.md (Brief: "As a user, I want to reset via email...")
│ ├── SPEC.md (Spec: Details for email flow)
│ └── PLAN.md (Plan: Coding tasks for email flow)
│
└── sms-reset/
├── README.md (Brief: "As a user, I want to reset via SMS...")
├── SPEC.md (Spec: Details for SMS flow, depends on Twilio service)
└── PLAN.md (Plan: Coding tasks for SMS flow)

**Why This Works:**

- Same structure at every level (easy to understand)
- Can start simple and add `features/` subdirectory when needed (no refactoring)
- Works for any depth (1 level, 2 levels, 10 levels - all valid)
- Clear parent-child relationships via directory structure
- Each level has its own SPEC.md defining its public contract

**Important Notes:**

- **Parent SPEC.md** defines the public contract for the ENTIRE feature (what other features can depend on)
- **Child SPEC.md** files define implementation details for that sub-feature only
- **Parent PLAN.md** is a roadmap (links to sub-features)
- **Child PLAN.md** files are checklists (actual tasks) OR roadmaps (if they have their own sub-features)
- Recursion stops when you reach "leaf" features with simple task checklists

**Decision Guidelines:**

- Feature with few tasks and single concern → Use checklist PLAN.md (leaf feature)
- Feature with many tasks or multiple concerns → Split into sub-features, use roadmap PLAN.md (parent feature)
- Sub-feature still too complex → Split again recursively (sub-sub-features)
- Continue subdivision until reaching manageable, cohesive units

**Note:** The "30 tasks" guideline is helpful but not absolute. Consider complexity, team preferences, and natural boundaries when deciding to split. Some teams prefer smaller features (15-20 tasks), others work well with larger ones (40-50 tasks).

### **Handling Large or Complex Documents**

If a _single file_ (like SPEC.md) becomes too large, use the "index and directory" pattern.

Create a spec/ directory and break the file apart. The main SPEC.md becomes an index linking to the parts.

/complex-feature/
├── README.md
├── SPEC.md \<-- This file now becomes an index
└── spec/
├── 01_data_schema.md
├── 02_api_endpoints.md
└── ...

**Example SPEC.md (as an index):**

\# Technical Spec: Complex Feature

\#\# Public Contract / API  
... (This must stay in the main file) ...

\#\# Dependencies
... (This must stay in the main file) ...

\#\# Detailed Specification  
This specification is broken down into multiple parts for clarity:  
\- \[Data Schema\](./spec/01_data_schema.md)  
\- \[API Endpoints\](./spec/02_api_endpoints.md)

This also applies to PLAN.md (using a plan/ directory) or README.md (using a brief/ directory).

## **Step 1.5: Investigation Before Specifying (Recommended for Agents)**

Before writing detailed specs, investigate existing patterns in the codebase:

**Investigation Checklist:**

- [ ] **Find Similar Features**
  - Search for features in same domain (e.g., other auth features if building auth)
  - Look at 3-5 existing feature directories
  - Note: directory structure, naming patterns, organization

- [ ] **Review Existing Dependencies**
  - Read SPEC.md files for features you might depend on
  - Check their Public Contract sections
  - Verify they provide what you need

- [ ] **Understand Testing Patterns**
  - Find existing test files (`**/*.test.*` or `**/*.spec.*`)
  - Note: test framework used, coverage targets, file organization
  - Check for TEST.md files in complex features

- [ ] **Check Coding Standards**
  - Look at similar code files
  - Note: indentation, naming conventions, file organization
  - Check for linter config (.eslintrc, etc.)

**Document Investigation Findings:**

Add a section to your SPEC.md Implementation Notes:

```markdown
## Implementation Notes

**Patterns Discovered:**

- Similar features located in: `docs/features/auth/`
- Testing: Jest, coverage target 80%, tests in `__tests__/` subdirectory
- Dependencies: Will use existing Auth Service and Email Service
- Coding style: 2-space indent, single quotes, semicolons required
```

**Why Investigation Helps:**

- Ensures consistency with existing codebase
- Identifies reusable features (dependencies)
- Prevents conflicting implementations
- Speeds up development (follow proven patterns)

---

## **Documentation Linking Convention**

All documentation must be reachable by following links from the root README.md. Links can be direct or indirect.

**Linking Chain Examples:**

- **Direct:** README.md → SPEC.md → PLAN.md
- **Indirect (with subdirectories):** README.md → SPEC.md → spec/01_data_schema.md
- **Sub-features:** Parent README.md → features/sub-feature/README.md

**Key Principle:** Everything must be discoverable by following markdown links, but doesn't need to be directly linked from README.md if it's already linked in the chain.

## **Examples: Good vs. Bad Documentation**

### **Example 1: Writing Clear Validation Rules**

**❌ BAD (Vague):**

```markdown
- Email should be valid
- Password should be strong enough
- Username should follow conventions
```

**✅ GOOD (Specific):**

```markdown
- Email: Valid RFC 5322 format, max 255 characters, normalized to lowercase
- Password: 8-128 characters, must contain: 1 uppercase, 1 lowercase, 1 number, 1 special character
- Username: 3-20 characters, alphanumeric + underscore, starts with letter
```

---

### **Example 2: Writing Clear Performance Requirements**

**❌ BAD (Subjective):**

```markdown
- API should respond quickly
- Database queries should be optimized
- System should handle reasonable load
```

**✅ GOOD (Measurable):**

```markdown
- API response time: <200ms at 95th percentile
- Database queries: <50ms per query using indexes
- Concurrent users: Support 1000+ simultaneous connections
```

---

### **Example 3: Writing Clear Error Handling**

**❌ BAD (Incomplete):**

```markdown
- Handle errors appropriately
- Show user-friendly messages
- Log errors for debugging
```

**✅ GOOD (Complete):**

```markdown
1. **Invalid Email**
   - Return: 400 Bad Request
   - Message: "Email format is invalid. Example: user@example.com"
   - Action: Log validation error with input (sanitized)

2. **User Not Found**
   - Return: 404 Not Found
   - Message: "No account found with this email"
   - Action: Log attempt for security monitoring
   - Note: Return same message whether user exists or not (prevent enumeration)

3. **Rate Limit Exceeded**
   - Return: 429 Too Many Requests
   - Message: "Too many attempts. Try again in 15 minutes."
   - Headers: Retry-After: 900
   - Action: Block further requests, alert on patterns
```

---

### **Example 4: Writing Clear Acceptance Criteria**

**❌ BAD (Vague):**

```markdown
- Component should work correctly
- Tests should pass
- Code should be clean
```

**✅ GOOD (Verifiable):**

```markdown
- Component renders without console errors
- All props are handled (test with valid, invalid, and missing values)
- TypeScript compiles: `tsc --noEmit` passes
- Linter passes: `npm run lint` with 0 warnings
- Tests pass: `npm test` all green
- Coverage: ≥80% lines, branches, and functions
- Accessibility: Passes `axe` audit with 0 violations
```

---

## **Feature Status Workflow**

Features progress through 4 clear states:

### **1. Planning**

- **When**: Initial creation, spec being written
- **README status**: `status: planning`
- **Activities**: Writing README, SPEC, PLAN
- **Ready to advance**: All specs complete and checklist verified

### **2. In-Progress**

- **When**: Implementation started
- **README status**: `status: in-progress`
- **Activities**: Writing code, tests, docs, updating TODO.md with progress
- **Ready to advance**: All tasks in PLAN.md checked off, tests pass

### **3. Blocked**

- **When**: Cannot proceed due to external dependency
- **README status**: `status: blocked`
- **MUST set**: `blocked_by: [link to issue/feature]`
- **Activities**: Document blocker, communicate with stakeholders
- **Ready to advance**: Blocker resolved

### **4. Complete**

- **When**: All done, deployed, working
- **README status**: `status: complete`
- **Activities**: Final validation, documentation update
- **Note**: TODO.md is kept for audit trail (shows what was done)

**Status Transition Flow:**

```
planning → in-progress → complete
              ↓
           blocked
              ↓
         in-progress → complete
```

---

## **Quick Reference: Writing Agent-Friendly Specs**

### **Replace Vague Terms with Specific Criteria**

| ❌ Avoid      | ✅ Use Instead    | Example                                           |
| ------------- | ----------------- | ------------------------------------------------- |
| "good"        | Specific metric   | ❌ "good test coverage" → ✅ "≥80% coverage"      |
| "appropriate" | Exact requirement | ❌ "appropriate timeout" → ✅ "30 second timeout" |
| "sufficient"  | Quantified target | ❌ "sufficient memory" → ✅ "<512MB memory"       |
| "fast"        | Actual time       | ❌ "fast response" → ✅ "<200ms response"         |
| "should"      | "must" or remove  | ❌ "should validate" → ✅ "must validate"         |
| "many"        | Actual count      | ❌ "many users" → ✅ "1000+ users"                |
| "complex"     | Specific criteria | ❌ "complex feature" → ✅ "16+ tasks"             |

### **Validation Rule Template**

```markdown
### Field: `[field_name]`

- **Required**: Yes/No
- **Type**: string | number | boolean | date | enum
- **Format**: [Pattern, RFC, or standard]
- **Min length**: [number] characters/bytes
- **Max length**: [number] characters/bytes
- **Pattern**: [regex if applicable]
- **Valid values**: [list if enum]
- **Normalized**: [transformations applied]
- **Examples**:
  - Valid: `[example]`
  - Invalid: `[example]` → Error: "[message]"
```

### **Error Documentation Template**

````markdown
### Error: [Error Name]

- **Condition**: When does this occur?
- **HTTP Code**: [200-599]
- **Message**: "Exact user-facing message"
- **Response Body**: `json { "error": "..." } `
- **Action**: What system does (log, alert, block, etc.)
- **Recovery**: How user can fix it
````

---

## **TEST.md Convention (Required)**

Every feature MUST have a `TEST.md` file that defines ALL testing requirements.

**Purpose:**

- Define test coverage targets (unit, integration, e2e, performance) with specific percentages
- Document test scenarios and strategies for each testing layer
- Specify error scenarios and edge cases to test
- Define performance benchmarks with measurable criteria
- Provide test data requirements and security testing checklist

**Critical Rule:** ALL testing requirements go in TEST.md. Do NOT put testing details in SPEC.md or PLAN.md.

## **TODO.md Convention (Required)**

Every feature MUST have a `TODO.md` file for implementation tracking and validation.

**Purpose:**

- Track implementation progress with percentage complete
- Validate feature setup (all required files exist and properly structured)
- Document blockers, questions, and decisions made during development
- Provide validation checklists for code quality, testing, and documentation
- Link implementation tasks to PLAN.md items

**Default Template Includes:**

- Feature setup validation checklist (verifies all 5 files exist)
- Implementation task tracking (from PLAN.md)
- Quality validation checklist (code quality, testing, documentation)
- Progress tracking fields (status, progress_percentage, blockers_count)

**Lifecycle:**

- Created at the same time as all other feature files
- Updated throughout implementation to track progress
- Maintained even after feature is complete (provides audit trail)
