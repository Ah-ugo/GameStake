import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Create an axios instance
export const api = axios.create({
  baseURL: "https://gameapi2-sni6.onrender.com",
  // baseURL: "https://api.betmaster.com", // Use this in production
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error retrieving token:", error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration and network errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // Handle unauthorized (token expired or invalid)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // If refresh token logic is implemented, add it here.
        await AsyncStorage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
        return Promise.reject(error);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Handle network errors
    if (!error.response) {
      error.message = "Network error. Please check your internet connection.";
    }

    return Promise.reject(error);
  }
);
