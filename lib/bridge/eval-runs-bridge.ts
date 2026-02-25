/**
 * lib/bridge/eval-runs-bridge.ts
 * STORY-7.4 — Bridge helper for eval_runs and eval_run_task_results queries.
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const BRIDGE_PATH = process.env['BRIDGE_DIR'] ?? '/Users/mariuszkrawczyk/codermariusz/kira'
const BRIDGE_DB = `${BRIDGE_PATH}/data/bridge.db`
const VENV_PYTHON = `${BRIDGE_PATH}/.venv/bin/python`

export interface EvalRun {
  id: string
  run_type: string
  status: string
  started_at: string
  finished_at: string | null
  overall_score: number | null
  task_count: number
  passed_count: number
  failed_count: number
}

export interface EvalRunTaskResult {
  id: string
  run_id: string
  task_id: string
  actual_output: string | null
  passed: boolean
  diff_score: number
  created_at: string
  task_prompt: string | null
  task_category: string | null
}

export interface FindRunsResult {
  runs: EvalRun[]
  total: number
}

export interface FindTaskResultsForDiff {
  taskResults: EvalRunTaskResult[]
  prevRunId: string | null
  prevTaskResults: EvalRunTaskResult[]
}

function runBridgePython(script: string): unknown {
  const tempFile = join(tmpdir(), `bridge-eval-runs-${Date.now()}.py`)
  try {
    writeFileSync(tempFile, script, { encoding: 'utf8' })
    const result = execSync(`${VENV_PYTHON} "${tempFile}"`, {
      cwd: BRIDGE_PATH,
      encoding: 'utf8',
      timeout: 15000,
    })
    return JSON.parse(result.trim())
  } finally {
    try { unlinkSync(tempFile) } catch { /* ignore */ }
  }
}

export function findEvalRuns(options: { limit?: number; offset?: number } = {}): FindRunsResult {
  const limit = options.limit ?? 20
  const offset = options.offset ?? 0
  const script = `
import json, sqlite3
conn = sqlite3.connect(${JSON.stringify(BRIDGE_DB)})
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM eval_runs")
total = cur.fetchone()[0]
cur.execute("""
  SELECT id, run_type, status, started_at, finished_at,
         overall_score, task_count, passed_count, failed_count
  FROM eval_runs ORDER BY started_at DESC LIMIT ? OFFSET ?
""", (${limit}, ${offset}))
rows = []
for r in cur.fetchall():
  rows.append({"id":r["id"],"run_type":r["run_type"] or "manual","status":r["status"] or "completed","started_at":r["started_at"] or "","finished_at":r["finished_at"],"overall_score":r["overall_score"],"task_count":r["task_count"] or 0,"passed_count":r["passed_count"] or 0,"failed_count":r["failed_count"] or 0})
conn.close()
print(json.dumps({"runs": rows, "total": total}))
`
  return runBridgePython(script) as FindRunsResult
}

export function findEvalRunById(runId: string): EvalRun | null {
  const safe = runId.replace(/'/g, '')
  const script = `
import json, sqlite3
conn = sqlite3.connect(${JSON.stringify(BRIDGE_DB)})
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("SELECT id,run_type,status,started_at,finished_at,overall_score,task_count,passed_count,failed_count FROM eval_runs WHERE id=?", (${JSON.stringify(safe)},))
row = cur.fetchone()
conn.close()
if not row:
  print("null")
else:
  print(json.dumps({"id":row["id"],"run_type":row["run_type"] or "manual","status":row["status"] or "completed","started_at":row["started_at"] or "","finished_at":row["finished_at"],"overall_score":row["overall_score"],"task_count":row["task_count"] or 0,"passed_count":row["passed_count"] or 0,"failed_count":row["failed_count"] or 0}))
`
  return runBridgePython(script) as EvalRun | null
}

export function findEvalRunTaskResults(runId: string): FindTaskResultsForDiff {
  const safe = runId.replace(/'/g, '')
  const script = `
import json, sqlite3
conn = sqlite3.connect(${JSON.stringify(BRIDGE_DB)})
conn.row_factory = sqlite3.Row
cur = conn.cursor()
cur.execute("""
  SELECT tr.id,tr.run_id,tr.task_id,tr.actual_output,tr.passed,
    COALESCE(tr.diff_score,0.0) AS diff_score,tr.created_at,
    SUBSTR(COALESCE(et.prompt,''),1,200) AS task_prompt,et.category AS task_category
  FROM eval_run_task_results tr LEFT JOIN eval_tasks et ON et.id=tr.task_id
  WHERE tr.run_id=?
""", (${JSON.stringify(safe)},))
task_results = []
for r in cur.fetchall():
  task_results.append({"id":r["id"],"run_id":r["run_id"],"task_id":r["task_id"],"actual_output":r["actual_output"],"passed":bool(r["passed"]),"diff_score":float(r["diff_score"]),"created_at":r["created_at"] or "","task_prompt":r["task_prompt"],"task_category":r["task_category"]})
cur.execute("SELECT id FROM eval_runs WHERE started_at<(SELECT started_at FROM eval_runs WHERE id=?) AND id IS NOT NULL ORDER BY started_at DESC LIMIT 1", (${JSON.stringify(safe)},))
prev_row = cur.fetchone()
prev_run_id = prev_row["id"] if prev_row else None
prev_task_results = []
if prev_run_id:
  cur.execute("""
    SELECT tr.id,tr.run_id,tr.task_id,tr.actual_output,tr.passed,
      COALESCE(tr.diff_score,0.0) AS diff_score,tr.created_at,
      SUBSTR(COALESCE(et.prompt,''),1,200) AS task_prompt,et.category AS task_category
    FROM eval_run_task_results tr LEFT JOIN eval_tasks et ON et.id=tr.task_id WHERE tr.run_id=?
  """, (prev_run_id,))
  for r in cur.fetchall():
    prev_task_results.append({"id":r["id"],"run_id":r["run_id"],"task_id":r["task_id"],"actual_output":r["actual_output"],"passed":bool(r["passed"]),"diff_score":float(r["diff_score"]),"created_at":r["created_at"] or "","task_prompt":r["task_prompt"],"task_category":r["task_category"]})
conn.close()
print(json.dumps({"taskResults":task_results,"prevRunId":prev_run_id,"prevTaskResults":prev_task_results}))
`
  return runBridgePython(script) as FindTaskResultsForDiff
}
