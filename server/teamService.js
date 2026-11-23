import dotenv from 'dotenv';
dotenv.config();

const teamApiBaseUrl = process.env.TEAM_API_BASE_URL || 'https://data.placiobridge.com/api';
const teamApiKey = process.env.TEAM_API_KEY || '';

export const teamService = {
  async getTeamMembers() {
    try {
      const headers = {
        'Accept': 'application/json'
      };
      if (teamApiKey) {
        headers['Authorization'] = `Bearer ${teamApiKey}`;
      }

      const res = await fetch(`${teamApiBaseUrl}/team`, { headers, signal: AbortSignal.timeout(3000) });
      if (!res.ok) {
        throw new Error(`Team API returned HTTP ${res.status}`);
      }
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (err) {
      console.warn(`[TEAM SERVICE] Team API unavailable (${err.message}). Returning empty fallback.`);
      return [];
    }
  }
};
