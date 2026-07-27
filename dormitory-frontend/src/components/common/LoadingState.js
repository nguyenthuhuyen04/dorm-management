import React from "react";
import { Spin, Typography } from "antd";

const { Text } = Typography;

/**
 * Loading state component
 * Hiển thị spinner với thông điệp tùy chỉnh
 *
 * @param {object} props
 * @param {string} [props.message="Đang tải dữ liệu..."] - Thông điệp hiển thị
 * @param {number} [props.size=24] - Kích thước spinner
 * @param {boolean} [props.fullPage=false] - Chiếm toàn màn hình
 */
function LoadingState({
  message = "Đang tải dữ liệu...",
  size = 24,
  fullPage = false,
}) {
  const containerStyle = fullPage
    ? {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
        flexDirection: "column",
      }
    : {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "48px 0",
        flexDirection: "column",
        gap: 16,
      };

  return (
    <div style={containerStyle}>
      <Spin size="large" />
      <Text type="secondary" style={{ fontSize: 14, marginTop: 8 }}>
        {message}
      </Text>
    </div>
  );
}

export default LoadingState;
