export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STUDENT: "STUDENT",
};

export const getCurrentUserRole = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}")?.role || null;
  } catch (error) {
    return null;
  }
};

export const canManageRegulations = (role) => role === ROLES.ADMIN;
export const canManageSupportRequests = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canDeleteSupportRequests = (role) => role === ROLES.ADMIN;
export const canManageRoomChangeRequests = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canDeleteRoomChangeRequests = (role) => role === ROLES.ADMIN;
export const canCreateSupportRequests = (role) => role === ROLES.STUDENT;
export const canCreateRoomChangeRequests = (role) =>
  [ROLES.ADMIN, ROLES.MANAGER, ROLES.STUDENT].includes(role);
