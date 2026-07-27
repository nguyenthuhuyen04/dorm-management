import api from "../api/client";

export const getAll = (params) => api.get("/rooms", { params });
export const getById = (id) => api.get(`/rooms/${id}`);
export const create = (data) => api.post("/rooms", data);
export const update = (id, data) => api.put(`/rooms/${id}`, data);
export const remove = (id) => api.delete(`/rooms/${id}`);
export const getAvailableForRoomChange = () =>
  api.get("/rooms/available-for-room-change");
