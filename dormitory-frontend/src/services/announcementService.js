import api from "../api/client";

export const getAll = (params) => api.get("/announcements", { params });
export const getById = (id) => api.get(`/announcements/${id}`);
export const create = (data) => api.post("/announcements", data);
export const update = (id, data) => api.put(`/announcements/${id}`, data);
export const remove = (id) => api.delete(`/announcements/${id}`);
