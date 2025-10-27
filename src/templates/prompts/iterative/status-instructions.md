**Progress Tracking**

Update your progress in the status file as you work.

**Status File:** `{{workspacePath}}/.status.json`

**Current Directory:** `{{projectRoot}}`

**Required Format:**

```json
{
  "complete": false,
  "worked": true,
  "summary": "Brief status update",
  "lastUpdated": "2025-10-16T14:30:00Z"
}
```

**Required Fields:**

- `complete` (boolean): Set to `true` when ALL work is finished, `false` otherwise
- `worked` (boolean): Set to `true` if you did work, `false` if there was nothing to do
- `summary` (string): Brief description of what you accomplished (or why nothing was done)

**Optional Fields:**

- `lastUpdated` (string): ISO 8601 timestamp
- `phase` (string): Current phase/stage if working in phases
- `blockers` (string[]): List of blocking issues
- `notes` (string): Additional context

**When to set complete: true:**

- All tasks from your instructions are finished
- No remaining work to do
- You've accomplished everything specified

**When to set worked: false:**

- You followed the instructions but determined there was nothing to do
- All tasks were already complete

**Example - Did Work:**

```json
{
  "complete": false,
  "worked": true,
  "summary": "Completed authentication module and user management API",
  "lastUpdated": "2025-10-16T15:30:00Z"
}
```

**Example - All Work Complete:**

```json
{
  "complete": true,
  "worked": true,
  "summary": "Completed final components - all tasks done",
  "lastUpdated": "2025-10-16T15:45:00Z"
}
```

**Example - Nothing Left to Do:**

```json
{
  "complete": true,
  "worked": false,
  "summary": "All tasks already complete, nothing to do",
  "lastUpdated": "2025-10-16T16:00:00Z"
}
```

**Update Command Example:**

```bash
cat > {{workspacePath}}/.status.json <<'EOF'
{
  "complete": false,
  "worked": true,
  "summary": "Brief status update",
  "lastUpdated": "2025-10-16T14:30:00Z"
}
EOF
```
