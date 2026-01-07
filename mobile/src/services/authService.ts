import axios from 'axios';
import { API_BASE_URL } from './api';

export interface User {
  id: number;
  email: string;
  name: string;
  provider: string;
  is_active: boolean;
  created_at: string;
  google_id?: string;
  picture_url?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/api/auth/login`,
      { email, password }
    );
    return response.data;
  }

  async signup(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${API_BASE_URL}/api/auth/register`,
      { name, email, password }
    );
    return response.data;
  }

  async getProfile(token: string): Promise<User> {
    const response = await axios.get<User>(
      `${API_BASE_URL}/api/auth/me`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  async updateProfile(token: string, data: { name?: string }): Promise<User> {
    const response = await axios.put<User>(
      `${API_BASE_URL}/api/auth/me`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
}

export const authService = new AuthService();
