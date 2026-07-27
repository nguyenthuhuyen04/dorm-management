import React from "react";
import { Modal } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

/**
 * Confirm dialog component (Modal-based)
 * Dùng để xác nhận các hành động nguy hiểm (xóa, hủy...)
 *
 * @param {object} props
 * @param {boolean} props.visible - Hiển thị dialog
 * @param {string} [props.title="Xác nhận"] - Tiêu đề dialog
 * @param {string|React.ReactNode} [props.content="Bạn có chắc chắn?"] - Nội dung
 * @param {string} [props.okText="Xác nhận"] - Text nút OK
 * @param {string} [props.cancelText="Hủy"] - Text nút Hủy
 * @param {function} [props.onOk] - Callback khi click OK
 * @param {function} [props.onCancel] - Callback khi click Hủy
 * @param {object} [props.okButtonProps] - Props cho nút OK (vd: { danger: true })
 * @param {boolean} [props.danger=false] - Nút OK màu đỏ
 * @param {boolean} [props.loading] - Trạng thái loading
 * @param {React.ReactNode} [props.icon] - Icon hiển thị
 */
function ConfirmDialog({
  visible,
  title = "Xác nhận",
  content = "Bạn có chắc chắn?",
  okText = "Xác nhận",
  cancelText = "Hủy",
  onOk,
  onCancel,
  okButtonProps,
  danger = false,
  loading = false,
  icon,
}) {
  return (
    <Modal
      title={
        <span>
          {icon || (
            <ExclamationCircleOutlined
              style={{ color: danger ? "#ff4d4f" : "#faad14", marginRight: 8 }}
            />
          )}
          {title}
        </span>
      }
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText={okText}
      cancelText={cancelText}
      okButtonProps={{
        danger,
        loading,
        ...okButtonProps,
      }}
      cancelButtonProps={{ disabled: loading }}
      centered
      width={420}
      destroyOnHidden
    >
      <div style={{ padding: "8px 0", fontSize: 14, lineHeight: 1.6 }}>
        {content}
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
