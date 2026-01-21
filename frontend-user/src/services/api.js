import axios from 'axios';

// USE ENVIRONMENT VARIABLE, FALLBACK TO LOCALHOST
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_URL });
// Automatically add Token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
};

export const patientAPI = {
  chat: (message, history) => api.post('/patient/chat', { message, history }),
  getDoctors: () => api.get('/patient/doctors'),
  getSlots: (doctorId, date) => api.get('/patient/slots', { params: { doctor_id: doctorId, date_str: date } }),
  bookAppointment: (data) => api.post('/patient/book_appointment', data),
  uploadPrescription: (formData) => api.post('/patient/upload_prescription', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  bookLab: (data) => api.post('/patient/book_lab', data), // New
  getMyAppointments: (id) => api.get(`/patient/my_appointments/${id}`),
  // NEW: Get Prescriptions
  getMyPrescriptions: (id) => api.get(`/patient/my_prescriptions/${id}`),
  
  // NEW: Register Call
  register: (data) => api.post('/auth/register', data),
};

export default api;