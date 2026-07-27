import api from "../api/client";

export const getAll = (params) => api.get("/room-change-requests", { params });
export const getById = (id) => api.get(`/room-change-requests/${id}`);
export const create = (data) => api.post("/room-change-requests", data);
export const update = (id, data) =>
  api.put(`/room-change-requests/${id}`, data);
export const remove = (id) => api.delete(`/room-change-requests/${id}`);
