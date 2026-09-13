import { Column } from './column.model';

export interface Board {
  _id: string;
  projectId: string;
  name: string;
  position: number;
}

export interface BoardWithColumns extends Board {
  columns: Column[];
}

export interface CreateBoardPayload {
  name: string;
  position?: number;
}
