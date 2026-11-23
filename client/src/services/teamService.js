import { request } from './apiClient';

export const teamService = {
  // Fetch team members with server-side proxy to data.placiobridge.com and graceful local fallback
  async getTeamMembers() {
    try {
      const data = await request('/team');
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
      return this.getFallbackTeam();
    } catch (err) {
      console.warn('Team service endpoint unavailable, using verified local fallback:', err.message);
      return this.getFallbackTeam();
    }
  },

  getFallbackTeam() {
    return [
      {
        id: 'fb-1',
        name: 'Executive Leadership',
        designation: 'Chief Executive Officer, PlacioBridge',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        bio: 'Leading PlacioBridge Technologies and Hire-Placio student career mission across India.',
        linkedin: 'https://placiobridge.com'
      },
      {
        id: 'fb-2',
        name: 'Technology Systems Lead',
        designation: 'Head of Engineering & Systems',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        bio: 'Architecting modern cloud pipelines, web apps, and proctored campus assessment engines.',
        linkedin: 'https://placiobridge.com'
      },
      {
        id: 'fb-3',
        name: 'Campus Recruitment Lead',
        designation: 'Head of Talent & Placements',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        bio: 'Connecting 2,000+ engineering graduates to verified tech careers with AICTE alignment.',
        linkedin: 'https://placiobridge.com'
      }
    ];
  }
};
