import api from "../api/client";

export const getAll = (params) => api.get("/users", { params });
export const getById = (id) => api.get(`/users/${id}`);
export const create = (data) => api.post("/users", data);
export const update = (id, data) => api.put(`/users/${id}`, data);
export const remove = (id) => api.delete(`/users/${id}`);
