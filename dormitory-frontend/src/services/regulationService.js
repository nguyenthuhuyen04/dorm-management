import api from "../api/client";

export const getAll = (params) => api.get("/regulations", { params });
export const getById = (id) => api.get(`/regulations/${id}`);
export const create = (data) => api.post("/regulations", data);
export const update = (id, data) => api.put(`/regulations/${id}`, data);
export const remove = (id) => api.delete(`/regulations/${id}`);
