import { request } from './apiClient';

export const applicationService = {
  // Apply to job with match evaluation and resume binding
  async applyToJob(jobId, { resume, coverLetter = '' } = {}) {
    return request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify({ resume, coverLetter })
    });
  },

  // Get applications for current candidate (or all for admin)
  async getApplications() {
    return request('/applications');
  },

  // Admin update status
  async updateStatus(applicationId, status, notes = '') {
    return request(`/admin/applications/${applicationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes })
    });
  },

  // Admin view candidate detail
  async getCandidateProfile(candidateId) {
    return request(`/admin/candidates/${candidateId}`);
  }
};
