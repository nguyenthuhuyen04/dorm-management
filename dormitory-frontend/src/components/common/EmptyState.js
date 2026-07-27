import React from "react";
import { Empty, Button, Typography } from "antd";

const { Text } = Typography;

/**
 * Empty state component
 * Hiển thị khi không có dữ liệu với thông điệp và nút hành động tùy chỉnh
 *
 * @param {object} props
 * @param {string} [props.description="Không có dữ liệu"] - Thông điệp hiển thị
 * @param {React.ReactNode} [props.image=Empty.PRESENTED_IMAGE_SIMPLE] - Ảnh minh họa
 * @param {string} [props.actionText] - Text cho nút hành động
 * @param {function} [props.onAction] - Callback khi click nút
 * @param {React.ReactNode} [props.icon] - Icon tùy chỉnh
 */
function EmptyState({
  description = "Không có dữ liệu",
  image = Empty.PRESENTED_IMAGE_SIMPLE,
  actionText,
  onAction,
  icon,
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
      }}
    >
      {icon && (
        <div style={{ fontSize: 48, marginBottom: 16, color: "#bbb" }}>
          {icon}
        </div>
      )}
      <Empty
        image={image}
        description={
          <Text type="secondary" style={{ fontSize: 14 }}>
            {description}
          </Text>
        }
      />
      {actionText && onAction && (
        <Button type="primary" style={{ marginTop: 16 }} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
