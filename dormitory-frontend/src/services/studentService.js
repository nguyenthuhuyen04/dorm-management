import api from "../api/client";

export const getAll = (params) => api.get("/students", { params });
export const getById = (id) => api.get(`/students/${id}`);
export const create = (data) => api.post("/students", data);
export const update = (id, data) => api.put(`/students/${id}`, data);
export const remove = (id) => api.delete(`/students/${id}`);
