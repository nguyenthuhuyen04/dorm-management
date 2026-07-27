import React, { useState } from "react";
import { Layout, Breadcrumb } from "antd";
import { Outlet, useLocation, Link } from "react-router-dom";
import { HomeOutlined } from "@ant-design/icons";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { MENU_ITEMS } from "../utils/constants";

const { Content } = Layout;

// Build breadcrumb name map from MENU_ITEMS
const buildPathLabelMap = () => {
  const map = {};
  Object.values(MENU_ITEMS).forEach((roleMenus) => {
    roleMenus.forEach((item) => {
      map[item.key] = item.label;
      if (item.children) {
        item.children.forEach((child) => {
          map[child.key] = child.label;
        });
      }
    });
  });
  return map;
};

const pathLabelMap = buildPathLabelMap();

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const pathSnippets = location.pathname.split("/").filter((i) => i);

  const breadcrumbItems = [
    {
      title: (
        <Link to="/" style={{ color: "rgba(0,0,0,0.45)" }}>
          <HomeOutlined style={{ marginRight: 4 }} />
          Trang chủ
        </Link>
      ),
      key: "home",
    },
    ...pathSnippets.map((_, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join("/")}`;
      const label = pathLabelMap[url] || pathSnippets[index];
      const isLast = index === pathSnippets.length - 1;
      return {
        title: isLast ? (
          <span style={{ fontWeight: 500, color: "#1a1a2e" }}>{label}</span>
        ) : (
          <Link to={url} style={{ color: "rgba(0,0,0,0.45)" }}>
            {label}
          </Link>
        ),
        key: url,
      };
    }),
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: "#f5f7fb" }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout style={{ background: "#f5f7fb" }}>
        <Header
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
        <Content
          style={{
            margin: 20,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <Breadcrumb
            items={breadcrumbItems}
            style={{
              padding: "2px 2px 0",
              fontSize: 13,
            }}
          />
          <div
            style={{
              padding: 24,
              background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
              borderRadius: 16,
              minHeight: "calc(100vh - 160px)",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
              border: "1px solid #eef2f7",
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default MainLayout;
