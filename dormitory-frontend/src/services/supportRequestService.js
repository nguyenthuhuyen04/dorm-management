import api from "../api/client";

export const getAll = (params) => api.get("/support-requests", { params });
export const getById = (id) => api.get(`/support-requests/${id}`);
export const create = (data) => api.post("/support-requests", data);
export const update = (id, data) => api.put(`/support-requests/${id}`, data);
export const remove = (id) => api.delete(`/support-requests/${id}`);
