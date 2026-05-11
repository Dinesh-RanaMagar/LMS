import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.endsWith('/admin/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      if (window.location.pathname !== '/login') {
        window.location.replace('/login');
      }
    }
    return Promise.reject(error);
  }
);

export const adminAPI = {
  register: (data) => apiClient.post('/admin/register', data),
  login: (data) => apiClient.post('/admin/login', data),
  getProfile: () => apiClient.get('/admin/profile'),
  logout: () => apiClient.post('/admin/logout'),
};

export const academicYearAPI = {
  create: (data) => apiClient.post('/academic-years', data),
  getAll: () => apiClient.get('/academic-years'),
  getById: (id) => apiClient.get(`/academic-years/${id}`),
  update: (id, data) => apiClient.put(`/academic-years/${id}`, data),
  setActive: (id) => apiClient.put(`/academic-years/${id}/set-active`),
  delete: (id) => apiClient.delete(`/academic-years/${id}`),
};

export const classAPI = {
  create: (data) => apiClient.post('/classes', data),
  getAll: () => apiClient.get('/classes'),
  getById: (id) => apiClient.get(`/classes/${id}`),
  update: (id, data) => apiClient.put(`/classes/${id}`, data),
  delete: (id) => apiClient.delete(`/classes/${id}`),
};

export const studentAPI = {
  create: (data) => apiClient.post('/students', data),
  getAll: (params) => apiClient.get('/students', { params }),
  getById: (id) => apiClient.get(`/students/${id}`),
  update: (id, data) => apiClient.put(`/students/${id}`, data),
  delete: (id) => apiClient.delete(`/students/${id}`),
  importExcel: (formData) => apiClient.post('/students/import-excel', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  downloadImportTemplate: () => apiClient.get('/students/import-template', {
    responseType: 'blob',
  }),
};

export const subjectAPI = {
  create: (data) => apiClient.post('/subjects', data),
  getAll: () => apiClient.get('/subjects'),
  getById: (id) => apiClient.get(`/subjects/${id}`),
  update: (id, data) => apiClient.put(`/subjects/${id}`, data),
  delete: (id) => apiClient.delete(`/subjects/${id}`),
};

export const classSubjectAPI = {
  getAll: () => apiClient.get('/class-subjects'),
  createOrUpdate: (data) => apiClient.post('/class-subjects/create-or-update', data),
};

export const examAPI = {
  // CRUD
  create:      (data)     => apiClient.post('/exams', data),
  createBulk:  (data)     => apiClient.post('/exams/create-bulk', data),
  getAll:      (params)   => apiClient.get('/exams', { params }),
  getById:     (id)       => apiClient.get(`/exams/${id}`),
  update:      (id, data) => apiClient.put(`/exams/${id}`, data),
  delete:      (id)       => apiClient.delete(`/exams/${id}`),
  // Status
  updateStatus: (id, status) => apiClient.patch(`/exams/${id}/status`, { status }),
  lock:         (id)         => apiClient.post(`/exams/${id}/lock`),
  unlock:       (id)         => apiClient.post(`/exams/${id}/unlock`),
  publishResult: (id)        => apiClient.post(`/exams/${id}/publish-result`),
};

export const marksheetAPI = {
  create: (data) => apiClient.post('/marksheets', data),
  getAll: (params) => apiClient.get('/marksheets', { params }),
  getById: (id) => apiClient.get(`/marksheets/${id}`),
  getByStudentExam: (studentId, examId) =>
    apiClient.get(`/marksheets/student/${studentId}/exam/${examId}`),
  update: (id, data) => apiClient.put(`/marksheets/${id}`, data),
  delete: (id) => apiClient.delete(`/marksheets/${id}`),
};

export const promotionAPI = {
  getEligible: () => apiClient.get('/promotions/eligible'),
  promote: (data) => apiClient.post('/promotions/promote', data),
  promoteStudent: (data) => apiClient.post('/promotions/promote-student', data),
  getHistory: (studentId) => apiClient.get(`/promotions/history/${studentId}`),
  getAllHistory: () => apiClient.get('/promotions/history'),
};

export const teacherAPI = {
  create: (data) => apiClient.post('/teachers', data),
  getAll: () => apiClient.get('/teachers'),
  getById: (id) => apiClient.get(`/teachers/${id}`),
  update: (id, data) => apiClient.put(`/teachers/${id}`, data),
  delete: (id) => apiClient.delete(`/teachers/${id}`),
};

export const noticeAPI = {
  create: (data) => apiClient.post('/notices', data),
  getAll: () => apiClient.get('/notices'),
  update: (id, data) => apiClient.put(`/notices/${id}`, data),
  delete: (id) => apiClient.delete(`/notices/${id}`),
};

export const attendanceAPI = {
  save: (data) => apiClient.post('/attendance', data),
  getAll: (params) => apiClient.get('/attendance', { params }),
  delete: (id) => apiClient.delete(`/attendance/${id}`),
};

export const settingsAPI = {
  get: () => apiClient.get('/settings'),
  update: (data) => apiClient.put('/settings', data),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return apiClient.post('/uploads/settings-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default apiClient;
