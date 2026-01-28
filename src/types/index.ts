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

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: "pending" | "done";
  user_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type CreateTaskInput = {
  title: string;
  description?: string;
  status: "pending" | "done";
} & Record<string, unknown>;

export type UpdateTaskInput = {
  title?: string;
  description?: string;
  status?: "pending" | "done";
} & Record<string, unknown>;

export interface LoginResponse {
  token: string;
  user: UserResponse;
}

export interface AuthContext {
  userId: number;
}
