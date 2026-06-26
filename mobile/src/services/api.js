import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  process.env.API_BASE_URL || 'http://localhost:5001/api';

const ML_BASE_URL =
  process.env.ML_BASE_URL || 'http://localhost:8000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.mlBaseURL = ML_BASE_URL;
  }

  // Helper method to get auth headers
  async getAuthHeaders() {
    const token = await AsyncStorage.getItem('intellicivic_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Helper method to handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      const errorMessage = error.reason
        ? `${error.message || 'Error'}: ${error.reason}`
        : error.message || 'Something went wrong';
      throw new Error(errorMessage);
    }
    return response.json();
  }

  // ================= FILE UPLOADS =================
  async uploadImage(file) {
    const formData = new FormData();
    formData.append('image', {
      uri: file.uri,
      type: file.type || 'image/jpeg',
      name: file.fileName || 'image.jpg',
    });

    const token = await AsyncStorage.getItem('intellicivic_token');
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/upload/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    return this.handleResponse(response);
  }

  // ================= AUTH =================
  async register(userData) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  async adminLogin(email, password) {
    const response = await fetch(`${this.baseURL}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  async employeeLogin(employeeId, password) {
    const response = await fetch(`${this.baseURL}/auth/employee/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, password }),
    });
    return this.handleResponse(response);
  }

  // ================= ISSUES =================
  async createIssue(issueData) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify(issueData),
    });
    return this.handleResponse(response);
  }

  async getIssues(params = {}) {
    const headers = await this.getAuthHeaders();
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/issues?${queryString}`, {
      headers,
    });
    return this.handleResponse(response);
  }

  async getIssue(id) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/issues/${id}`, {
      headers,
    });
    return this.handleResponse(response);
  }

  async updateIssue(id, updates) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/issues/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });
    return this.handleResponse(response);
  }

  async deleteIssue(id) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/issues/${id}`, {
      method: 'DELETE',
      headers,
    });
    return this.handleResponse(response);
  }

  // ================= ADMIN =================
  async getAdminDashboard() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/admin/dashboard`, {
      headers,
    });
    return this.handleResponse(response);
  }

  async getAdminAnalytics() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/admin/analytics`, {
      headers,
    });
    return this.handleResponse(response);
  }

  async assignIssue(issueId, employeeId) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/admin/issues/${issueId}/assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ employeeId }),
    });
    return this.handleResponse(response);
  }

  // ================= EMPLOYEE =================
  async getAssignedIssues() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/employee/issues`, {
      headers,
    });
    return this.handleResponse(response);
  }

  async acceptIssue(issueId) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/employee/issues/${issueId}/accept`, {
      method: 'POST',
      headers,
    });
    return this.handleResponse(response);
  }

  async resolveIssue(issueId, resolutionData) {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/employee/issues/${issueId}/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify(resolutionData),
    });
    return this.handleResponse(response);
  }

  // ================= LEADERBOARD =================
  async getLeaderboard() {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseURL}/issues/leaderboard`, {
      headers,
    });
    return this.handleResponse(response);
  }

  // ================= ML BACKEND =================
  async submitToMLBackend(reportData) {
    const response = await fetch(`${this.mlBaseURL}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    return this.handleResponse(response);
  }
}

export default new ApiService();

