import api from "../api/client";

export const getAll = (params) => api.get("/utility-bills", { params });
export const getById = (id) => api.get(`/utility-bills/${id}`);
export const create = (data) => api.post("/utility-bills", data);
export const update = (id, data) => api.put(`/utility-bills/${id}`, data);
export const remove = (id) => api.delete(`/utility-bills/${id}`);
