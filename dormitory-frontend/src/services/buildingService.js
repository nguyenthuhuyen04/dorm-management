import api from "../api/client";

export const getAll = (params) => api.get("/buildings", { params });
export const getById = (id) => api.get(`/buildings/${id}`);
export const create = (data) => api.post("/buildings", data);
export const update = (id, data) => api.put(`/buildings/${id}`, data);
export const remove = (id) => api.delete(`/buildings/${id}`);
