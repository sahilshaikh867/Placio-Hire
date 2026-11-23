import { uploadFile, request } from './apiClient';

export const storageService = {
  // Candidate resume upload (PDF, DOC, DOCX) to private Supabase bucket
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('resume', file);
    return uploadFile('/candidate/resume', formData);
  },

  // Candidate profile photo upload (JPG, PNG, WebP)
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    return uploadFile('/candidate/photo', formData);
  },

  // Get private resume signed URL with expiration
  async getResumeSignedUrl(userId) {
    const query = userId ? `?userId=${userId}` : '';
    return request(`/candidate/resume-url${query}`);
  },

  getFileUrl(filename) {
    if (!filename) return null;
    if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
    return filename;
  }
};
