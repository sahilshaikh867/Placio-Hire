import { request } from './apiClient';

export const jobService = {
  // Public job search with filters
  async getJobs({ search = '', type = '', workplace = '', location = '' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (type) params.append('type', type);
    if (workplace) params.append('workplace', workplace);
    if (location) params.append('location', location);

    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/jobs${query}`);
  },

  // Get job details
  async getJobById(id) {
    return request(`/jobs/${id}`);
  },

  // Evaluate match score before applying
  async getJobMatch(id) {
    return request(`/jobs/${id}/match`);
  },

  // Admin APIs
  async getAdminJobs({ search = '', status = 'all', sort = 'newest' } = {}) {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'all') params.append('status', status);
    if (sort) params.append('sort', sort);

    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/admin/jobs${query}`);
  },

  async createJob(jobData) {
    return request('/admin/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  },

  async updateJob(id, jobData) {
    return request(`/admin/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    });
  },

  async deleteJob(id) {
    return request(`/admin/jobs/${id}`, {
      method: 'DELETE'
    });
  },

  async getAdminStats() {
    return request('/admin/stats');
  },

  async getAdminAnalytics(range = '30d') {
    return request(`/admin/analytics?range=${range}`);
  },

  async getCandidates({ q = '', degree = 'all', minCgpa = '' } = {}) {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (degree && degree !== 'all') params.append('degree', degree);
    if (minCgpa) params.append('minCgpa', minCgpa);

    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/admin/candidates${query}`);
  },

  async getCandidateDetails(id) {
    return request(`/admin/candidates/${id}`);
  },

  async getAuditLogs() {
    return request('/admin/audit-logs');
  },

  async getAdminAccounts() {
    return request('/admin/admins');
  }
};
