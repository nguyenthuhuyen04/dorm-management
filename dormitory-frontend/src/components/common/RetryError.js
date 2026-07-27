import React from "react";
import { Alert, Button, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Retry error component
 * Hiển thị lỗi với nút thử lại
 *
 * @param {object} props
 * @param {string} [props.message="Có lỗi xảy ra"] - Thông điệp lỗi
 * @param {string} [props.description] - Mô tả chi tiết lỗi
 * @param {function} [props.onRetry] - Callback khi click thử lại
 * @param {string} [props.retryText="Thử lại"] - Text cho nút thử lại
 * @param {boolean} [props.fullPage=false] - Chiếm toàn màn hình
 * @param {"error" | "warning"} [props.type="error"] - Loại alert
 */
function RetryError({
  message = "Có lỗi xảy ra",
  description,
  onRetry,
  retryText = "Thử lại",
  fullPage = false,
  type = "error",
}) {
  const containerStyle = fullPage
    ? {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }
    : {
        padding: "24px 0",
      };

  return (
    <div style={containerStyle}>
      <Alert
        type={type}
        message={message}
        description={
          description && (
            <div>
              <Text>{description}</Text>
              {onRetry && (
                <div style={{ marginTop: 12 }}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={onRetry}
                    size="small"
                  >
                    {retryText}
                  </Button>
                </div>
              )}
            </div>
          )
        }
        showIcon
        style={{ maxWidth: 500, width: "100%" }}
        action={
          !description && onRetry ? (
            <Button icon={<ReloadOutlined />} onClick={onRetry} size="small">
              {retryText}
            </Button>
          ) : null
        }
      />
    </div>
  );
}

export default RetryError;
