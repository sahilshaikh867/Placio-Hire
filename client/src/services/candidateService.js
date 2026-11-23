import { request, uploadFile } from './apiClient';

export const candidateService = {
  // Candidate Profile
  async getProfile() {
    return request('/me');
  },

  async updateProfile(profileData) {
    return request('/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  // Education
  async getEducation() {
    return request('/candidate/education');
  },

  async addEducation(eduData) {
    return request('/candidate/education', {
      method: 'POST',
      body: JSON.stringify(eduData)
    });
  },

  async deleteEducation(id) {
    return request(`/candidate/education/${id}`, {
      method: 'DELETE'
    });
  },

  // Experience
  async getExperience() {
    return request('/candidate/experience');
  },

  async addExperience(expData) {
    return request('/candidate/experience', {
      method: 'POST',
      body: JSON.stringify(expData)
    });
  },

  async deleteExperience(id) {
    return request(`/candidate/experience/${id}`, {
      method: 'DELETE'
    });
  },

  // Structured Skills
  async getSkills() {
    return request('/candidate/skills');
  },

  async addSkill(skillData) {
    return request('/candidate/skills', {
      method: 'POST',
      body: JSON.stringify(skillData)
    });
  },

  async deleteSkill(id) {
    return request(`/candidate/skills/${id}`, {
      method: 'DELETE'
    });
  },

  // Projects
  async getProjects() {
    return request('/candidate/projects');
  },

  async addProject(projData) {
    return request('/candidate/projects', {
      method: 'POST',
      body: JSON.stringify(projData)
    });
  },

  async deleteProject(id) {
    return request(`/candidate/projects/${id}`, {
      method: 'DELETE'
    });
  },

  // Certifications
  async getCertifications() {
    return request('/candidate/certifications');
  },

  async addCertification(certData) {
    return request('/candidate/certifications', {
      method: 'POST',
      body: JSON.stringify(certData)
    });
  },

  async deleteCertification(id) {
    return request(`/candidate/certifications/${id}`, {
      method: 'DELETE'
    });
  },

  // Career Preferences
  async getPreferences() {
    return request('/candidate/preferences');
  },

  async updatePreferences(prefData) {
    return request('/candidate/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefData)
    });
  },

  // File Uploads
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('resume', file);
    return uploadFile('/candidate/resume', formData);
  },

  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    return uploadFile('/candidate/photo', formData);
  }
};
