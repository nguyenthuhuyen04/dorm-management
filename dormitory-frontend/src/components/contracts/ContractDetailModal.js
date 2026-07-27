import React from "react";
import { Modal, Descriptions, Tag, Spin, Empty } from "antd";

const STATUS_MAP = {
  ACTIVE: { color: "green", label: "Hoạt động" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

function ContractDetailModal({ visible, onCancel, contract, loading }) {
  return (
    <Modal
      title="Chi tiết hợp đồng"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Spin spinning={loading}>
        {!contract ? (
          <Empty description="Không có dữ liệu hợp đồng" />
        ) : (
          <>
            <Descriptions
              title="Thông tin hợp đồng"
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Mã hợp đồng">
                <strong>{contract.contractCode}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={STATUS_MAP[contract.status]?.color || "default"}>
                  {STATUS_MAP[contract.status]?.label || contract.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày bắt đầu">
                {formatDate(contract.startDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày kết thúc">
                {formatDate(contract.endDate)}
              </Descriptions.Item>
              <Descriptions.Item label="Tiền đặt cọc">
                {formatCurrency(contract.deposit)}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {formatDate(contract.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Người tạo">
                {contract.creator?.fullName || "—"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title="Thông tin sinh viên"
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Mã sinh viên">
                {contract.student?.studentCode || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Họ tên">
                {contract.student?.user?.fullName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Giới tính">
                {contract.student?.gender === "Male"
                  ? "Nam"
                  : contract.student?.gender === "Female"
                    ? "Nữ"
                    : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Mã sinh viên (ID)">
                #{contract.student?.id || "—"}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions
              title="Thông tin phòng"
              bordered
              column={{ xs: 1, sm: 2 }}
              size="small"
            >
              <Descriptions.Item label="Phòng">
                {contract.room?.roomNumber || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Tòa nhà">
                {contract.room?.building?.buildingName || "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Phí phòng">
                {formatCurrency(contract.room?.roomFee)}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Spin>
    </Modal>
  );
}

export default ContractDetailModal;
