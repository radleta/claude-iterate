**Progress Tracking**

Update your progress in the status file as you work.

**Status File:** `{{workspacePath}}/.status.json`

**Current Directory:** `{{projectRoot}}`

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

- `complete` (boolean): Set to `true` when ALL work is finished, `false` otherwise
- `progress.completed` (number): Count of items you've completed so far
- `progress.total` (number): Total count of items to complete

**Optional Fields:**

- `summary` (string): Brief human-readable status
- `lastUpdated` (string): ISO 8601 timestamp
- `phase` (string): Current phase/stage if working in phases
- `blockers` (string[]): List of blocking issues
- `notes` (string): Additional context

**When to set complete: true:**

- All tasks from your instructions are finished
- `progress.completed === progress.total`
- No remaining work

**Example - Work in Progress:**

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

**Update Command Example:**

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
