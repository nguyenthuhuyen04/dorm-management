import axios from "axios";
import { handleApiError } from "../utils/toast";

const getApiBaseUrl = () => {
  const configuredUrl =
    process.env.REACT_APP_API_URL || "http://localhost:3000/api";
  return configuredUrl.replace(/\/$/, "");
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const rawAuthUser = localStorage.getItem("authUser");
    const authUser = rawAuthUser ? JSON.parse(rawAuthUser) : null;
    const token = authUser?.accessToken || localStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Unable to parse auth user from storage", error);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authUser");
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
    } else if (error.response?.status >= 500) {
      handleApiError(error);
    }

    return Promise.reject(error);
  },
);

export default api;
