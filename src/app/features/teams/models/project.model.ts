import { BoardWithColumns } from './board.model';

export type ProjectStatus = 'active' | 'archived' | 'completed';

export interface Project {
  _id: string;
  teamId: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdBy: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWithBoards extends Project {
  boards: BoardWithColumns[];
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  dueDate?: string;
}

export interface UpdateProjectPayload extends Partial<CreateProjectPayload> {
  status?: ProjectStatus;
}
