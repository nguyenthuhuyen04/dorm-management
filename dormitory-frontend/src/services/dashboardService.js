import api from "../api/client";

export const getDashboard = () => api.get("/dashboard");
export const getStudentDashboard = () => api.get("/dashboard/student");
