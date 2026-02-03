import { z } from 'zod';

// ═══════════════════════════════════════════════════════════
// TASK FORM SCHEMA
// ═══════════════════════════════════════════════════════════

export const taskFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Tytuł jest wymagany')
    .max(200, 'Tytuł może mieć maksymalnie 200 znaków'),

  description: z
    .string()
    .max(2000, 'Opis może mieć maksymalnie 2000 znaków')
    .optional(),

  priority: z.enum(['low', 'medium', 'high', 'urgent']),

  column: z.enum(['idea', 'plan', 'in_progress', 'done']),

  due_date: z.string().optional(),

  assignee_id: z.string().uuid().optional(),

  labels: z.array(z.string()),

  subtasks: z.array(
    z.object({
      title: z.string().min(1),
      done: z.boolean(),
    })
  ),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

// ═══════════════════════════════════════════════════════════
// DEFAULT VALUES — dla nowego taska
// ═══════════════════════════════════════════════════════════

export const defaultTaskValues: TaskFormValues = {
  title: '',
  description: '',
  priority: 'medium',
  column: 'idea',
  due_date: undefined,
  assignee_id: undefined,
  labels: [],
  subtasks: [],
};
