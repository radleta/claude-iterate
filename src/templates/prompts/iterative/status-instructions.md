**IMPORTANT: Status Tracking**

After completing work this iteration, you MUST update the status file.

**Status File Location:** `{{workspacePath}}/.status.json`

**Your Current Directory:** `{{projectRoot}}`

**Example Update Command:**

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

- `complete` (boolean): Set to `true` when you determine ALL work is finished
- `worked` (boolean): Set to `true` if you did work this iteration, `false` if there was nothing to do
- `summary` (string): Brief description of what you accomplished (or why nothing was done)

**Iterative Mode - How to Report Status:**

1. **If you did work this iteration:**

   ```json
   {
     "complete": false,
     "worked": true,
     "summary": "Completed authentication module and user management API",
     "lastUpdated": "2025-10-16T15:30:00Z"
   }
   ```

2. **If you completed ALL remaining work:**

   ```json
   {
     "complete": true,
     "worked": true,
     "summary": "Completed final components - all tasks done",
     "lastUpdated": "2025-10-16T15:45:00Z"
   }
   ```

3. **If you found nothing left to do:**
   ```json
   {
     "complete": true,
     "worked": false,
     "summary": "All tasks already complete, nothing to do",
     "lastUpdated": "2025-10-16T16:00:00Z"
   }
   ```

**Optional Fields:**

- `phase` (string): Current phase/stage if working in phases
- `blockers` (string[]): List of blocking issues preventing progress
- `notes` (string): Additional context about current state

**When to set complete: true:**

- All tasks from your instructions are finished
- No remaining work to do
- You've accomplished everything in the instructions

**When to set worked: false:**

- You followed the instructions but determined there was nothing to do
- All tasks were already complete
- You're reporting "no work needed" status

**CRITICAL:** The system uses `.status.json` to detect completion. Always update this file at the end of each iteration with accurate status.
