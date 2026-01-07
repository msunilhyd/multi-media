import axios from 'axios';
import { API_BASE_URL } from './api';

export interface FavoriteTeam {
  id: number;
  user_id: number;
  team_name: string;
  created_at: string;
}

export interface FavoriteTeamCreate {
  team_name: string;
}

class FavoritesService {
  async getFavoriteTeams(token: string): Promise<FavoriteTeam[]> {
    const response = await axios.get<FavoriteTeam[]>(
      `${API_BASE_URL}/api/favorites/teams`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  async addFavoriteTeam(token: string, teamName: string): Promise<FavoriteTeam> {
    const response = await axios.post<FavoriteTeam>(
      `${API_BASE_URL}/api/favorites/teams`,
      { team_name: teamName },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }

  async removeFavoriteTeam(token: string, favoriteId: number): Promise<void> {
    await axios.delete(
      `${API_BASE_URL}/api/favorites/teams/${favoriteId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }

  async replaceFavoriteTeams(
    token: string,
    teams: FavoriteTeamCreate[]
  ): Promise<FavoriteTeam[]> {
    const response = await axios.put<FavoriteTeam[]>(
      `${API_BASE_URL}/api/favorites/teams/replace`,
      { teams },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  }
}

export const favoritesService = new FavoritesService();
