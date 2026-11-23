import { request } from './apiClient';

export const notificationService = {
  async getNotifications() {
    return request('/notifications');
  },

  async markAsRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'POST'
    });
  }
};
