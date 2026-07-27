import api from "../api/client";

export const login = (payload) => api.post("/auth/login", payload);
export const logout = () => api.post("/auth/logout");
export const getProfile = () => api.get("/users/me");
