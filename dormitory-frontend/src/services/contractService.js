import api from "../api/client";

export const getAll = (params) => api.get("/contracts", { params });
export const getById = (id) => api.get(`/contracts/${id}`);
export const create = (data) => api.post("/contracts", data);
export const update = (id, data) => api.put(`/contracts/${id}`, data);
export const remove = (id) => api.delete(`/contracts/${id}`);
