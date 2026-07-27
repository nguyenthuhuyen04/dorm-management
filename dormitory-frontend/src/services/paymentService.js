import api from "../api/client";

export const getAll = (params) => api.get("/payments", { params });
export const getById = (id) => api.get(`/payments/${id}`);
export const create = (data) => api.post("/payments", data);
export const update = (id, data) => api.put(`/payments/${id}`, data);
export const remove = (id) => api.delete(`/payments/${id}`);
