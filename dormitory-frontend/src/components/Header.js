import React from "react";
import { Layout, Avatar, Dropdown, Typography, Tag, Space, Badge } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/authService";
import { ROLE_LABELS, ROLE_COLORS, APP_ROUTES } from "../utils/constants";

const { Header: AntHeader } = Layout;
const { Text } = Typography;

function Header({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("authUser") || "{}");
  const roleColor = ROLE_COLORS[user?.role] || "#1890ff";
  const roleLabel = ROLE_LABELS[user?.role] || "";

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Ignore backend logout failure and clear client state anyway.
    } finally {
      localStorage.removeItem("authUser");
      navigate("/login", { replace: true });
    }
  };

  const getProfilePath = () => {
    if (user?.role === "ADMIN") return APP_ROUTES.ADMIN_PROFILE;
    if (user?.role === "MANAGER") return APP_ROUTES.MANAGER_PROFILE;
    return APP_ROUTES.STUDENT_PROFILE;
  };

  const userMenuItems = [
    {
      key: "profile",
      label: "Thông tin cá nhân",
      icon: <UserOutlined />,
      onClick: () => navigate(getProfilePath()),
    },
    { type: "divider" },
    {
      key: "logout",
      label: "Đăng xuất",
      icon: <LogoutOutlined />,
      onClick: handleLogout,
      danger: true,
    },
  ];

  const displayName =
    user?.fullName || user?.username || user?.email || "Người dùng";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <AntHeader
      style={{
        background: "linear-gradient(90deg, #ffffff 0%, #f8fbff 100%)",
        padding: "0 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 16px rgba(15, 23, 42, 0.06)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 72,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {onToggle &&
          React.createElement(
            collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
            {
              style: { fontSize: 20, cursor: "pointer", color: "#333" },
              onClick: onToggle,
            },
          )}
        <Text strong style={{ fontSize: 18, color: "#1a1a2e" }}>
          Hệ thống quản lý ký túc xá
        </Text>
      </div>

      <Space size={24} align="center">
        <Badge count={3} size="small">
          <BellOutlined
            style={{ fontSize: 20, cursor: "pointer", color: "#555" }}
          />
        </Badge>

        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space
            style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 6 }}
            className="user-dropdown-trigger"
          >
            <Avatar
              style={{
                backgroundColor: roleColor,
                verticalAlign: "middle",
                fontWeight: 600,
              }}
              size={36}
            >
              {avatarLetter}
            </Avatar>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontWeight: 500, fontSize: 14, color: "#333" }}>
                {displayName}
              </div>
              <Tag color={roleColor} style={{ fontSize: 11, margin: 0 }}>
                {roleLabel}
              </Tag>
            </div>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}

export default Header;
