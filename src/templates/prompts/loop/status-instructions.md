**IMPORTANT: Status Tracking**

After completing work this iteration, you MUST update the status file.

**Status File Location:** `{{workspacePath}}/.status.json`

**Your Current Directory:** `{{projectRoot}}`

**Example Update Command:**

```bash
cat > {{workspacePath}}/.status.json <<'EOF'
{
  "complete": false,
  "progress": { "completed": 35, "total": 60 },
  "summary": "Brief status update",
  "lastUpdated": "2025-10-16T14:30:00Z"
}
EOF
```

**Required Format:**

```json
{
  "complete": false,
  "progress": {
    "completed": 35,
    "total": 60
  },
  "summary": "Brief status update",
  "lastUpdated": "2025-10-16T14:30:00Z"
}
```

**Required Fields:**

- `complete` (boolean): Set to `true` ONLY when ALL work is finished
- `progress.completed` (number): Count of items you've completed so far
- `progress.total` (number): Total count of items to complete

**Loop Mode Tracking:**

- Increment `progress.completed` by 1 each iteration as you complete items
- Keep `progress.total` constant (the full scope)
- Update `summary` with what you just completed
- Update any tracking files your instructions specify (e.g., TODO.md if mentioned)

**Optional Fields:**

- `summary` (string): Brief human-readable status - RECOMMENDED for loop mode
- `lastUpdated` (string): ISO 8601 timestamp
- `phase` (string): Current phase/stage if working in phases
- `blockers` (string[]): List of blocking issues preventing progress
- `notes` (string): Additional context about current state

**Completion Criteria:**
Set `complete: true` when:

- All tasks from your instructions are finished
- `progress.completed === progress.total`
- No remaining work or blockers

**Example - In Progress (Loop Mode):**

```json
{
  "complete": false,
  "progress": {
    "completed": 35,
    "total": 60
  },
  "summary": "Completed /users endpoint with tests",
  "lastUpdated": "2025-10-16T15:30:00Z",
  "phase": "api-endpoints"
}
```

**Example - Complete:**

```json
{
  "complete": true,
  "progress": {
    "completed": 60,
    "total": 60
  },
  "summary": "All 60 API endpoints migrated, tested, and documented",
  "lastUpdated": "2025-10-16T16:00:00Z"
}
```

**CRITICAL:** The system uses `.status.json` to detect completion. If you don't update this file correctly, the iteration loop will not recognize task completion.
