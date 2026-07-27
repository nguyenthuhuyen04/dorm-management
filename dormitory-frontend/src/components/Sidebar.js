import React from "react";
import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  HomeOutlined,
  AppstoreOutlined,
  SmileOutlined,
  FileTextOutlined,
  DollarOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  BellOutlined,
  BookOutlined,
  NotificationOutlined,
  CustomerServiceOutlined,
  SwapOutlined,
  BankOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { MENU_ITEMS } from "../utils/constants";

const { Sider } = Layout;

const ICON_MAP = {
  DashboardOutlined: <DashboardOutlined />,
  UserOutlined: <UserOutlined />,
  TeamOutlined: <TeamOutlined />,
  HomeOutlined: <HomeOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  SmileOutlined: <SmileOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  DollarOutlined: <DollarOutlined />,
  CreditCardOutlined: <CreditCardOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  BellOutlined: <BellOutlined />,
  BookOutlined: <BookOutlined />,
  NotificationOutlined: <NotificationOutlined />,
  CustomerServiceOutlined: <CustomerServiceOutlined />,
  SwapOutlined: <SwapOutlined />,
  BankOutlined: <BankOutlined />,
};

function Sidebar({ collapsed, onCollapse }) {
  const navigate = useNavigate();
  const location = useLocation();
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const role = authUser?.role;

  const menuItems = MENU_ITEMS[role] || [];

  const convertToAntdMenuItems = (items) => {
    return items.map((item) => {
      const menuItem = {
        key: item.key,
        icon: ICON_MAP[item.icon] || null,
        label: item.label,
      };

      if (item.children) {
        menuItem.children = convertToAntdMenuItems(item.children);
      } else {
        menuItem.onClick = () => navigate(item.key);
      }

      return menuItem;
    });
  };

  const antdMenuItems = convertToAntdMenuItems(menuItems);

  // Find selected keys - support submenu items
  const getSelectedKeys = () => {
    const path = location.pathname;
    // Check if any menu item key matches the current path
    for (const item of menuItems) {
      if (item.key === path) return [path];
      if (item.children) {
        for (const child of item.children) {
          if (child.key === path) return [path];
        }
      }
    }
    return [path];
  };

  // Find open submenu keys
  const getOpenKeys = () => {
    const path = location.pathname;
    const openKeys = [];
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.key === path) {
            openKeys.push(item.key);
          }
        }
      }
    }
    return openKeys;
  };

  return (
    <Sider
      width={240}
      collapsed={collapsed}
      onCollapse={onCollapse}
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
        height: "100vh",
        position: "sticky",
        top: 0,
        left: 0,
        overflow: "auto",
        boxShadow: "0 4px 18px rgba(15, 23, 42, 0.25)",
      }}
    >
      <div
        style={{
          color: "#fff",
          padding: collapsed ? "20px 8px" : "20px 16px",
          fontSize: collapsed ? 14 : 18,
          fontWeight: 600,
          textAlign: collapsed ? "center" : "left",
          whiteSpace: "nowrap",
          overflow: "hidden",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {collapsed ? "KTX" : "Ký túc xá"}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={antdMenuItems}
        style={{ borderRight: 0 }}
      />
    </Sider>
  );
}

export default Sidebar;
