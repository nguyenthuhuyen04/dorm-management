export const APP_ROUTES = {
  LOGIN: "/login",
  ADMIN_DASHBOARD: "/admin/dashboard",
  MANAGER_DASHBOARD: "/manager/dashboard",
  STUDENT_DASHBOARD: "/student/dashboard",
  USERS: "/admin/users",
  BUILDINGS: "/admin/buildings",
  ROOMS: "/admin/rooms",
  STUDENTS: "/admin/students",
  CONTRACTS: "/admin/contracts",
  PAYMENTS: "/admin/payments",
  UTILITY_BILLS: "/admin/utility-bills",
  ANNOUNCEMENTS: "/admin/announcements",
  REGULATIONS: "/admin/regulations",
  SUPPORT_REQUESTS: "/admin/support-requests",
  ROOM_CHANGE_REQUESTS: "/admin/room-change-requests",
  MANAGER_BUILDINGS: "/manager/buildings",
  MANAGER_ROOMS: "/manager/rooms",
  MANAGER_CONTRACTS: "/manager/contracts",
  MANAGER_PAYMENTS: "/manager/payments",
  MANAGER_UTILITY_BILLS: "/manager/utility-bills",
  MANAGER_ANNOUNCEMENTS: "/manager/announcements",
  MANAGER_REGULATIONS: "/manager/regulations",
  MANAGER_SUPPORT_REQUESTS: "/manager/support-requests",
  MANAGER_ROOM_CHANGE_REQUESTS: "/manager/room-change-requests",
  ADMIN_PROFILE: "/admin/profile",
  MANAGER_PROFILE: "/manager/profile",
  STUDENT_PROFILE: "/student/profile",
  STUDENT_CONTRACT: "/student/my-contract",
  STUDENT_PAYMENTS: "/student/my-payments",
  STUDENT_ANNOUNCEMENTS: "/student/announcements",
  STUDENT_REGULATIONS: "/student/regulations",
  STUDENT_SUPPORT_REQUESTS: "/student/support-requests",
  STUDENT_ROOM_CHANGE_REQUESTS: "/student/room-change-requests",
};

export const ROLES = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STUDENT: "STUDENT",
};

export const ROLE_LABELS = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  STUDENT: "Sinh viên",
};

export const ROLE_COLORS = {
  ADMIN: "#f5222d",
  MANAGER: "#fa8c16",
  STUDENT: "#1890ff",
};

export const DASHBOARD_BY_ROLE = {
  ADMIN: APP_ROUTES.ADMIN_DASHBOARD,
  MANAGER: APP_ROUTES.MANAGER_DASHBOARD,
  STUDENT: APP_ROUTES.STUDENT_DASHBOARD,
};

export const MENU_ITEMS = {
  ADMIN: [
    {
      key: APP_ROUTES.ADMIN_DASHBOARD,
      icon: "DashboardOutlined",
      label: "Bảng điều khiển",
    },
    {
      key: APP_ROUTES.ADMIN_PROFILE,
      icon: "UserOutlined",
      label: "Thông tin cá nhân",
    },
    {
      key: "admin-users",
      icon: "UserOutlined",
      label: "Quản lý người dùng",
      children: [
        {
          key: APP_ROUTES.USERS,
          icon: "TeamOutlined",
          label: "Danh sách người dùng",
        },
      ],
    },
    {
      key: "admin-facilities",
      icon: "HomeOutlined",
      label: "Cơ sở vật chất",
      children: [
        {
          key: APP_ROUTES.BUILDINGS,
          icon: "BankOutlined",
          label: "Tòa nhà",
        },
        {
          key: APP_ROUTES.ROOMS,
          icon: "AppstoreOutlined",
          label: "Phòng",
        },
      ],
    },
    {
      key: APP_ROUTES.STUDENTS,
      icon: "SmileOutlined",
      label: "Sinh viên",
    },
    {
      key: APP_ROUTES.CONTRACTS,
      icon: "FileTextOutlined",
      label: "Hợp đồng",
    },
    {
      key: "admin-finance",
      icon: "DollarOutlined",
      label: "Tài chính",
      children: [
        {
          key: APP_ROUTES.PAYMENTS,
          icon: "CreditCardOutlined",
          label: "Thanh toán",
        },
        {
          key: APP_ROUTES.UTILITY_BILLS,
          icon: "ThunderboltOutlined",
          label: "Hóa đơn tiện ích",
        },
      ],
    },
    {
      key: "admin-communication",
      icon: "BellOutlined",
      label: "Truyền thông",
      children: [
        {
          key: APP_ROUTES.ANNOUNCEMENTS,
          icon: "NotificationOutlined",
          label: "Thông báo",
        },
        {
          key: APP_ROUTES.REGULATIONS,
          icon: "BookOutlined",
          label: "Nội quy",
        },
      ],
    },
    {
      key: APP_ROUTES.SUPPORT_REQUESTS,
      icon: "CustomerServiceOutlined",
      label: "Yêu cầu hỗ trợ",
    },
    {
      key: APP_ROUTES.ROOM_CHANGE_REQUESTS,
      icon: "SwapOutlined",
      label: "Yêu cầu đổi phòng",
    },
  ],
  MANAGER: [
    {
      key: APP_ROUTES.MANAGER_DASHBOARD,
      icon: "DashboardOutlined",
      label: "Bảng điều khiển",
    },
    {
      key: APP_ROUTES.MANAGER_PROFILE,
      icon: "UserOutlined",
      label: "Thông tin cá nhân",
    },
    {
      key: APP_ROUTES.MANAGER_BUILDINGS,
      icon: "BankOutlined",
      label: "Tòa nhà",
    },
    {
      key: APP_ROUTES.MANAGER_ROOMS,
      icon: "AppstoreOutlined",
      label: "Phòng",
    },
    {
      key: APP_ROUTES.MANAGER_CONTRACTS,
      icon: "FileTextOutlined",
      label: "Hợp đồng",
    },
    {
      key: "manager-finance",
      icon: "DollarOutlined",
      label: "Tài chính",
      children: [
        {
          key: APP_ROUTES.MANAGER_PAYMENTS,
          icon: "CreditCardOutlined",
          label: "Thanh toán",
        },
        {
          key: APP_ROUTES.MANAGER_UTILITY_BILLS,
          icon: "ThunderboltOutlined",
          label: "Hóa đơn tiện ích",
        },
      ],
    },
    {
      key: APP_ROUTES.MANAGER_ANNOUNCEMENTS,
      icon: "NotificationOutlined",
      label: "Thông báo",
    },
    {
      key: APP_ROUTES.MANAGER_REGULATIONS,
      icon: "BookOutlined",
      label: "Nội quy",
    },
    {
      key: APP_ROUTES.MANAGER_SUPPORT_REQUESTS,
      icon: "CustomerServiceOutlined",
      label: "Yêu cầu hỗ trợ",
    },
    {
      key: APP_ROUTES.MANAGER_ROOM_CHANGE_REQUESTS,
      icon: "SwapOutlined",
      label: "Yêu cầu đổi phòng",
    },
  ],
  STUDENT: [
    {
      key: APP_ROUTES.STUDENT_DASHBOARD,
      icon: "DashboardOutlined",
      label: "Bảng điều khiển",
    },
    {
      key: APP_ROUTES.STUDENT_PROFILE,
      icon: "UserOutlined",
      label: "Thông tin cá nhân",
    },
    {
      key: APP_ROUTES.STUDENT_CONTRACT,
      icon: "FileTextOutlined",
      label: "Hợp đồng của tôi",
    },
    {
      key: APP_ROUTES.STUDENT_PAYMENTS,
      icon: "CreditCardOutlined",
      label: "Thanh toán của tôi",
    },
    {
      key: APP_ROUTES.STUDENT_ANNOUNCEMENTS,
      icon: "NotificationOutlined",
      label: "Thông báo",
    },
    {
      key: APP_ROUTES.STUDENT_REGULATIONS,
      icon: "BookOutlined",
      label: "Nội quy",
    },
    {
      key: APP_ROUTES.STUDENT_SUPPORT_REQUESTS,
      icon: "CustomerServiceOutlined",
      label: "Yêu cầu hỗ trợ",
    },
    {
      key: APP_ROUTES.STUDENT_ROOM_CHANGE_REQUESTS,
      icon: "SwapOutlined",
      label: "Yêu cầu đổi phòng",
    },
  ],
};
