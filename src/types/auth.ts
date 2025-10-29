export interface SignupRequest {
  email: string;
  password: string;
  username: string;
  referralCode?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  totalEarnings?: number;
  referralCode?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
}
