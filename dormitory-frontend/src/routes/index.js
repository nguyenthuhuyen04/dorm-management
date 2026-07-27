import { createBrowserRouter, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import LoginPage from "../pages/Login";
import AdminDashboardPage from "../pages/AdminDashboard";
import ManagerDashboardPage from "../pages/ManagerDashboard";
import StudentDashboardPage from "../pages/StudentDashboard";
import ContractsPage from "../pages/admin/ContractsPage";
import UsersPage from "../pages/admin/UsersPage";
import BuildingsPage from "../pages/admin/BuildingsPage";
import StudentsPage from "../pages/admin/StudentsPage";
import RegulationsAdminPage from "../pages/admin/RegulationsPage";
import RoomsPage from "../pages/admin/RoomsPage";
import PaymentsPage from "../pages/admin/PaymentsPage";
import UtilityBillsPage from "../pages/admin/UtilityBillsPage";
import AnnouncementsAdminPage from "../pages/admin/AnnouncementsPage";
import SupportRequestsAdminPage from "../pages/admin/SupportRequestsPage";
import RoomChangeRequestsAdminPage from "../pages/admin/RoomChangeRequestsPage";
import ProfilePage from "../pages/ProfilePage";
import StudentProfilePage from "../pages/student/StudentProfilePage";
import MyContractPage from "../pages/student/MyContractPage";
import MyPaymentsPage from "../pages/student/MyPaymentsPage";
import AnnouncementsPage from "../pages/student/AnnouncementsPage";
import RegulationsPage from "../pages/student/RegulationsPage";
import SupportRequestsPage from "../pages/student/SupportRequestsPage";
import RoomChangeRequestsStudentPage from "../pages/student/RoomChangeRequestsPage";
import { APP_ROUTES, DASHBOARD_BY_ROLE } from "../utils/constants";

// Dynamic redirect component that reads from localStorage each time
function DashboardRedirect() {
  const authUser = JSON.parse(localStorage.getItem("authUser") || "null");
  const targetPath = DASHBOARD_BY_ROLE[authUser?.role] || APP_ROUTES.LOGIN;
  return <Navigate to={targetPath} replace />;
}

const router = createBrowserRouter([
  {
    path: APP_ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardRedirect />,
      },
      {
        path: "admin",
        element: <Navigate to={APP_ROUTES.ADMIN_DASHBOARD} replace />,
      },
      {
        path: "manager",
        element: <Navigate to={APP_ROUTES.MANAGER_DASHBOARD} replace />,
      },
      {
        path: "student",
        element: <Navigate to={APP_ROUTES.STUDENT_DASHBOARD} replace />,
      },
      // === ADMIN ROUTES ===
      {
        path: "admin/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/users",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/buildings",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <BuildingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/rooms",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <RoomsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/students",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <StudentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/contracts",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ContractsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/payments",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <PaymentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/utility-bills",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <UtilityBillsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/announcements",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AnnouncementsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/regulations",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <RegulationsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/support-requests",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <SupportRequestsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/room-change-requests",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <RoomChangeRequestsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/profile",
        element: (
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      // === MANAGER ROUTES ===
      {
        path: "manager/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ManagerDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/buildings",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <BuildingsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/rooms",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <RoomsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/contracts",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ContractsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/payments",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <PaymentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/utility-bills",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <UtilityBillsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/announcements",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <AnnouncementsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/regulations",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <RegulationsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/support-requests",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <SupportRequestsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/room-change-requests",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <RoomChangeRequestsAdminPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "manager/profile",
        element: (
          <ProtectedRoute allowedRoles={["MANAGER"]}>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      // === STUDENT ROUTES ===
      {
        path: "student/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student/profile",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <StudentProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student/my-contract",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <MyContractPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student/my-payments",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <MyPaymentsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student/announcements",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <AnnouncementsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student/regulations",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <RegulationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student/support-requests",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <SupportRequestsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "student/room-change-requests",
        element: (
          <ProtectedRoute allowedRoles={["STUDENT"]}>
            <RoomChangeRequestsStudentPage />
          </ProtectedRoute>
        ),
      },
      // === CATCH-ALL ===
      {
        path: "*",
        element: (
          <div style={{ padding: 48, textAlign: "center" }}>
            <h1>404</h1>
            <p>Trang bạn tìm kiếm không tồn tại.</p>
          </div>
        ),
      },
    ],
  },
]);

export default router;
