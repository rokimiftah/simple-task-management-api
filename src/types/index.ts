export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
} & Record<string, unknown>;

export interface LoginInput {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
}

export type Priority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "done";
  priority: Priority;
  due_date: string | null;
  tags: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  status: "pending" | "done";
  priority?: Priority;
  due_date?: string | null;
  tags?: string[];
} & Record<string, unknown>;

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: "pending" | "done";
  priority?: Priority;
  due_date?: string | null;
  tags?: string[];
} & Record<string, unknown>;

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface AuthContext {
  userId: number;
}

export interface TaskFilter {
  priority?: Priority;
  due_date_from?: string;
  due_date_to?: string;
  tags?: string[];
  search?: string;
}

export type TaskSortBy = "title" | "due_date" | "priority" | "created_at";
export type TaskSortOrder = "asc" | "desc";

export interface TaskQuery {
  page?: number;
  limit?: number;
  priority?: Priority;
  due_date_from?: string;
  due_date_to?: string;
  tags?: string;
  sort_by?: TaskSortBy;
  sort_order?: TaskSortOrder;
  search?: string;
}
