export interface User {
  name: string;
  role: string;
  avatar: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  message?: string;
}
