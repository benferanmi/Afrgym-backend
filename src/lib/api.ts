import axios from 'axios';

const BASE_URL = "https://afrgym.com.ng/wp-json";

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const authState = localStorage.getItem("gym-auth-storage");
  if (authState) {
    try {
      const parsedAuth = JSON.parse(authState);
      const token = parsedAuth.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Failed to parse auth token:", error);
    }
  }
  return config;
});

export default api;
