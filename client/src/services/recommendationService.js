import { request } from './apiClient';

export const recommendationService = {
  // Fetch ranked recommendations for the authenticated candidate
  async getRecommendations() {
    return request('/candidate/recommendations');
  },

  // Helper to format match score with vibrant badge label
  formatMatchBadge(score) {
    if (score >= 85) {
      return {
        label: `🔥 ${score}% Best Match`,
        className: 'badge-match-best',
        color: '#ff5b2e'
      };
    }
    if (score >= 70) {
      return {
        label: `⭐ ${score}% Strong Match`,
        className: 'badge-match-strong',
        color: '#16a34a'
      };
    }
    if (score >= 50) {
      return {
        label: `⚡ ${score}% Moderate Match`,
        className: 'badge-match-moderate',
        color: '#d97706'
      };
    }
    return {
      label: `📌 ${score}% Potential Match`,
      className: 'badge-match-low',
      color: '#64748b'
    };
  }
};
