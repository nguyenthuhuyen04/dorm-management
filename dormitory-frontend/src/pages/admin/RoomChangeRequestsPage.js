import React, { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  message,
  Tooltip,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { roomChangeRequestService } from "../../services";
import {
  ROLES,
  canDeleteRoomChangeRequests,
  canManageRoomChangeRequests,
  getCurrentUserRole,
} from "../../utils/permissions";

const { Option } = Select;
const { Text } = Typography;

const STATUS_MAP = {
  PENDING: { color: "orange", label: "Chờ duyệt" },
  APPROVED: { color: "green", label: "Đã duyệt" },
  REJECTED: { color: "red", label: "Từ chối" },
};

function RoomChangeRequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const currentRole = getCurrentUserRole();
  const canManage = canManageRoomChangeRequests(currentRole);
  const canDelete = canDeleteRoomChangeRequests(currentRole);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await roomChangeRequestService.getAll({
        page: 1,
        limit: 100,
      });
      const payload = res?.data?.data || res?.data || [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err) {
      message.error("Không thể tải yêu cầu đổi phòng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({ status: record.status, reason: record.reason });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = { status: values.status, reason: values.reason };
      await roomChangeRequestService.update(editing.id, payload);
      message.success("Cập nhật yêu cầu thành công");
      setModalVisible(false);
      loadData();
    } catch (err) {
      message.error("Không thể lưu yêu cầu đổi phòng");
    }
  };

  const handleDelete = (record) => {
    const statusLabel = STATUS_MAP[record.status]?.label || record.status;
    const isFinalized =
      record.status === "APPROVED" || record.status === "REJECTED";
    Modal.confirm({
      title: "Xác nhận xóa yêu cầu đổi phòng",
      icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
      content: (
        <div style={{ marginTop: 12 }}>
          <p>
            <strong>Lý do:</strong> {record.reason}
          </p>
          <p>
            <strong>Trạng thái:</strong>{" "}
            <Tag color={STATUS_MAP[record.status]?.color}>{statusLabel}</Tag>
          </p>
          {isFinalized && (
            <p style={{ color: "#ff4d4f", marginTop: 12 }}>
              Yêu cầu đã được duyệt/từ chối. Bạn có chắc chắn muốn xóa?
            </p>
          )}
          {!isFinalized && (
            <p style={{ color: "#ff4d4f", marginTop: 12 }}>
              Hành động này không thể hoàn tác.
            </p>
          )}
        </div>
      ),
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await roomChangeRequestService.remove(record.id);
          message.success("Xóa yêu cầu thành công");
          loadData();
        } catch (err) {
          message.error("Không thể xóa yêu cầu");
        }
      },
    });
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Lý do", dataIndex: "reason", key: "reason" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={STATUS_MAP[s]?.color || "default"}>
          {STATUS_MAP[s]?.label || s}
        </Tag>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => {
        const isFinalized =
          record.status === "APPROVED" || record.status === "REJECTED";
        return (
          <Space>
            {canManage ? (
              <Tooltip
                title={
                  isFinalized
                    ? "Đã duyệt/từ chối - không thể chỉnh sửa"
                    : "Duyệt / từ chối"
                }
              >
                <span>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => openEdit(record)}
                    disabled={isFinalized}
                    style={
                      isFinalized ? { opacity: 0.4, cursor: "not-allowed" } : {}
                    }
                  >
                    Duyệt / từ chối
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {canDelete ? (
              <Tooltip
                title={
                  isFinalized
                    ? "Đã duyệt/từ chối - không thể xóa"
                    : "Xóa yêu cầu"
                }
              >
                <span>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record)}
                    disabled={isFinalized}
                    style={
                      isFinalized ? { opacity: 0.4, cursor: "not-allowed" } : {}
                    }
                  />
                </span>
              </Tooltip>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title="Quản lý yêu cầu đổi phòng"
      extra={
        currentRole === ROLES.MANAGER ? (
          <Text type="secondary">
            Bạn chỉ có thể xử lý các yêu cầu thuộc khu vực của mình.
          </Text>
        ) : null
      }
    >
      <Table
        rowKey="id"
        dataSource={items}
        columns={columns}
        loading={loading}
      />
      <Modal
        open={modalVisible}
        title="Cập nhật trạng thái"
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="reason" label="Lý do">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="PENDING">Chờ duyệt</Option>
              <Option value="APPROVED">Đã duyệt</Option>
              <Option value="REJECTED">Từ chối</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default RoomChangeRequestsPage;
