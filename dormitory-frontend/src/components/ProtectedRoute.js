import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { APP_ROUTES } from "../utils/constants";

const DASHBOARD_BY_ROLE = {
  ADMIN: APP_ROUTES.ADMIN_DASHBOARD,
  MANAGER: APP_ROUTES.MANAGER_DASHBOARD,
  STUDENT: APP_ROUTES.STUDENT_DASHBOARD,
};

function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const authUser = JSON.parse(localStorage.getItem("authUser") || "null");

  if (!authUser?.role) {
    return (
      <Navigate to={APP_ROUTES.LOGIN} replace state={{ from: location }} />
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(authUser.role)) {
    const fallbackPath = DASHBOARD_BY_ROLE[authUser.role] || APP_ROUTES.LOGIN;
    return <Navigate to={fallbackPath} replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;
