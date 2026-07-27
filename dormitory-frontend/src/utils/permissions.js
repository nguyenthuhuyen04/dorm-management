import { ROLES } from "./constants";

export { ROLES } from "./constants";

export const getCurrentUserRole = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}")?.role || null;
  } catch (error) {
    return null;
  }
};

export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem("authUser") || "{}");
  } catch (error) {
    return {};
  }
};

// === REGULATIONS ===
export const canManageRegulations = (role) => role === ROLES.ADMIN;

// === SUPPORT REQUESTS ===
export const canManageSupportRequests = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canDeleteSupportRequests = (role) => role === ROLES.ADMIN;
export const canCreateSupportRequests = (role) => true; // Mọi role đều tạo được

// === ROOM CHANGE REQUESTS ===
export const canManageRoomChangeRequests = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canDeleteRoomChangeRequests = (role) => role === ROLES.ADMIN;
export const canCreateRoomChangeRequests = (role) =>
  [ROLES.ADMIN, ROLES.MANAGER, ROLES.STUDENT].includes(role);

// === UTILITY BILLS ===
export const canDeleteUtilityBills = (role) => role === ROLES.ADMIN;
export const canManageUtilityBills = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;

// === ROOMS ===
export const canManageRooms = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canCreateRooms = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canEditRooms = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canDeleteRooms = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;

// === USERS ===
export const canManageUsers = (role) => role === ROLES.ADMIN;

// === ANNOUNCEMENTS ===
// MANAGER: chỉ xóa/sửa thông báo của mình
export const canManageAnnouncements = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canDeleteAnnouncements = (role) => role === ROLES.ADMIN;

// === CONTRACTS ===
export const canManageContracts = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
export const canDeleteContracts = (role) =>
  role === ROLES.ADMIN || role === ROLES.MANAGER;
