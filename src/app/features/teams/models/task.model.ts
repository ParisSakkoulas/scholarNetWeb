export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

export interface Task {
  _id: string;
  projectId: string;
  columnId: string;
  title: string;
  description?: string;
  parentTaskId?: string | null;
  assigneeIds: string[];
  labels: string[];
  priority: TaskPriority;
  dueDate?: string;
  position: number;
  status: TaskStatus;
  createdBy: string;
  doneAt?: string | null;
  /** set when an admin/owner has signed off the completed task */
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A team member that tasks can be assigned to. */
export interface AssigneeOption {
  _id: string;
  name: string;
  avatarUrl?: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  columnId: string;
  assigneeIds?: string[];
  parentTaskId?: string;
  labels?: string[];
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  status?: TaskStatus;
}

export interface MoveTaskPayload {
  columnId: string;
  position: number;
}

export interface TaskFilters {
  columnId?: string;
  assignee?: string;
  status?: TaskStatus;
}
