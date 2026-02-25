/**
 * lib/bridge/eval-tasks-bridge.ts
 * STORY-7.3 — Helper for Bridge Python subprocess calls to EvalTaskRepository.
 */

import { execSync } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { EvalTask, EvalCategory, EvalModel } from '@/lib/eval/types'

const BRIDGE_PATH = '/Users/mariuszkrawczyk/codermariusz/kira'
const VENV_PYTHON = `${BRIDGE_PATH}/.venv/bin/python`

interface FindAllOptions {
  category?: string
  active_only?: boolean
}

interface CreateTaskInput {
  prompt: string
  expected_output: string
  category: EvalCategory
  target_model: EvalModel
}

interface UpdateTaskInput {
  prompt?: string
  expected_output?: string
  category?: EvalCategory
  target_model?: EvalModel
  is_active?: boolean
}

function runBridgePython(script: string): unknown {
  // Write script to temp file to avoid shell injection issues
  const tempFile = join(tmpdir(), `bridge-script-${Date.now()}.py`)

  try {
    writeFileSync(tempFile, script, { encoding: 'utf8' })

    const result = execSync(
      `${VENV_PYTHON} "${tempFile}"`,
      { cwd: BRIDGE_PATH, encoding: 'utf8', timeout: 10000 }
    )
    return JSON.parse(result.trim())
  } finally {
    try {
      unlinkSync(tempFile)
    } catch {
      // ignore cleanup errors
    }
  }
}

export function findAllEvalTasks(options: FindAllOptions = {}): EvalTask[] {
  const { category, active_only = true } = options

  const script = `
import json
import sys
sys.path.insert(0, "${BRIDGE_PATH}")

from bridge.db.connection import DatabaseConnection
from bridge.db.repositories.eval_task_repo import EvalTaskRepository

db = DatabaseConnection()
repo = EvalTaskRepository(db)

tasks = repo.find_all(
    category=${category ? `"${category}"` : 'None'},
    active_only=${active_only}
)

print(json.dumps([t.model_dump() for t in tasks]))
`

  return runBridgePython(script) as EvalTask[]
}

export function findEvalTaskById(taskId: string): EvalTask | null {
  const script = `
import json
import sys
sys.path.insert(0, "${BRIDGE_PATH}")

from bridge.db.connection import DatabaseConnection
from bridge.db.repositories.eval_task_repo import EvalTaskRepository

db = DatabaseConnection()
repo = EvalTaskRepository(db)

task = repo.find_by_id("${taskId}")
print(json.dumps(task.model_dump() if task else None))
`

  return runBridgePython(script) as EvalTask | null
}

export function createEvalTask(input: CreateTaskInput): EvalTask {
  const script = `
import json
import sys
sys.path.insert(0, "${BRIDGE_PATH}")

from bridge.db.connection import DatabaseConnection
from bridge.db.repositories.eval_task_repo import EvalTaskRepository

db = DatabaseConnection()
repo = EvalTaskRepository(db)

task = repo.create(
    prompt=${JSON.stringify(input.prompt)},
    expected_output=${JSON.stringify(input.expected_output)},
    category="${input.category}",
    target_model="${input.target_model}"
)

print(json.dumps(task.model_dump()))
`

  return runBridgePython(script) as EvalTask
}

export function updateEvalTask(taskId: string, input: UpdateTaskInput): EvalTask {
  const fields: Record<string, unknown> = {}
  if (input.prompt !== undefined) fields.prompt = input.prompt
  if (input.expected_output !== undefined) fields.expected_output = input.expected_output
  if (input.category !== undefined) fields.category = input.category
  if (input.target_model !== undefined) fields.target_model = input.target_model
  if (input.is_active !== undefined) fields.is_active = input.is_active

  const script = `
import json
import sys
sys.path.insert(0, "${BRIDGE_PATH}")

from bridge.db.connection import DatabaseConnection
from bridge.db.repositories.eval_task_repo import EvalTaskRepository

db = DatabaseConnection()
repo = EvalTaskRepository(db)

task = repo.update(
    "${taskId}",
    **${JSON.stringify(fields)}
)

print(json.dumps(task.model_dump()))
`

  return runBridgePython(script) as EvalTask
}

export function deleteEvalTask(taskId: string): boolean {
  const script = `
import json
import sys
sys.path.insert(0, "${BRIDGE_PATH}")

from bridge.db.connection import DatabaseConnection
from bridge.db.repositories.eval_task_repo import EvalTaskRepository

db = DatabaseConnection()
repo = EvalTaskRepository(db)

result = repo.delete("${taskId}")
print(json.dumps(result))
`

  return runBridgePython(script) as boolean
}
