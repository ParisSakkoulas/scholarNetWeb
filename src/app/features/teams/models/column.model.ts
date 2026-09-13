export interface Column {
  _id: string;
  boardId: string;
  name: string;
  position: number;
  wipLimit?: number;
}

export interface CreateColumnPayload {
  name: string;
  position?: number;
  wipLimit?: number;
}
