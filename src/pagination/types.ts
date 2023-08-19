import { FilterQuery, PipelineStage, Types } from "mongoose";

interface PaginationParams<T> {
  next: Types.ObjectId | null;
  limit: number;
  sortAscending?: boolean;
  paginatedField?: keyof T;
  query?: PipelineStage[];
  match?: FilterQuery<T>;
}

export interface TablePaginationParams<T> extends PaginationParams<T> {
  previous: Types.ObjectId | null;
}

export type InfinitePaginationParams<T> = PaginationParams<T>;
