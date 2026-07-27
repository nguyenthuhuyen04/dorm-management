import React, { useCallback, useEffect, useState } from "react";
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
  Row,
  Col,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { supportRequestService } from "../../services";
import {
  ROLES,
  canDeleteSupportRequests,
  canManageSupportRequests,
  getCurrentUserRole,
} from "../../utils/permissions";

const { Option } = Select;
const { Text } = Typography;

const STATUS_MAP = {
  PENDING: { color: "orange", label: "Chờ xử lý" },
  PROCESSING: { color: "blue", label: "Đang xử lý" },
  DONE: { color: "green", label: "Đã xử lý" },
};

function SupportRequestsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [buildingNameFilter, setBuildingNameFilter] = useState("");
  const [form] = Form.useForm();
  const currentRole = getCurrentUserRole();
  const canManage = canManageSupportRequests(currentRole);
  const canDelete = canDeleteSupportRequests(currentRole);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const reqRes = await supportRequestService.getAll({
        page: 1,
        limit: 100,
        category: categoryFilter || undefined,
        buildingName: buildingNameFilter || undefined,
      });
      const payload = reqRes?.data?.data || reqRes?.data || [];
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err) {
      message.error("Không thể tải yêu cầu hỗ trợ");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, buildingNameFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setCategoryFilter("");
    setBuildingNameFilter("");
    setTimeout(() => loadData(), 0);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      status: record.status,
      reply: record.reply || "",
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        status: values.status,
        reply: values.reply || null,
      };
      await supportRequestService.update(editing.id, payload);
      message.success("Cập nhật yêu cầu thành công");
      setModalVisible(false);
      loadData();
    } catch (err) {
      message.error("Không thể lưu yêu cầu");
    }
  };

  const handleDelete = (record) => {
    const statusLabel = STATUS_MAP[record.status]?.label || record.status;
    const isDone = record.status === "DONE";
    Modal.confirm({
      title: "Xác nhận xóa yêu cầu hỗ trợ",
      icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
      content: (
        <div style={{ marginTop: 12 }}>
          <p>
            <strong>Tiêu đề:</strong> {record.title}
          </p>
          <p>
            <strong>Trạng thái:</strong>{" "}
            <Tag color={STATUS_MAP[record.status]?.color}>{statusLabel}</Tag>
          </p>
          {isDone && (
            <p style={{ color: "#ff4d4f", marginTop: 12 }}>
              Yêu cầu đã xử lý. Bạn có chắc chắn muốn xóa?
            </p>
          )}
          {!isDone && (
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
          await supportRequestService.remove(record.id);
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
    { title: "Tiêu đề", dataIndex: "title", key: "title" },
    { title: "Danh mục", dataIndex: "category", key: "category" },
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
        const isDone = record.status === "DONE";
        return (
          <Space>
            {canManage ? (
              <Tooltip
                title={
                  isDone ? "Đã xử lý - không thể chỉnh sửa" : "Xử lý yêu cầu"
                }
              >
                <span>
                  <Button
                    icon={<EditOutlined />}
                    onClick={() => openEdit(record)}
                    disabled={isDone}
                    style={
                      isDone ? { opacity: 0.4, cursor: "not-allowed" } : {}
                    }
                  >
                    Xử lý
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {canDelete ? (
              <Tooltip
                title={isDone ? "Đã xử lý - không thể xóa" : "Xóa yêu cầu"}
              >
                <span>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record)}
                    disabled={isDone}
                    style={
                      isDone ? { opacity: 0.4, cursor: "not-allowed" } : {}
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
      title="Quản lý yêu cầu hỗ trợ"
      extra={
        currentRole === ROLES.MANAGER ? (
          <Text type="secondary">
            Bạn chỉ có thể xử lý yêu cầu trong khu vực của mình.
          </Text>
        ) : null
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Row gutter={12} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Lọc theo danh mục"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Lọc theo tòa nhà"
              value={buildingNameFilter}
              onChange={(e) => setBuildingNameFilter(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Button onClick={handleSearch}>Tìm kiếm</Button>
          </Col>
          <Col>
            <Button onClick={handleReset}>Reset</Button>
          </Col>
        </Row>
      </div>
      <Table
        rowKey="id"
        dataSource={items}
        columns={columns}
        loading={loading}
      />
      <Modal
        open={modalVisible}
        title="Cập nhật trạng thái & phản hồi"
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="status"
            label="Trạng thái"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="PENDING">Chờ xử lý</Option>
              <Option value="PROCESSING">Đang xử lý</Option>
              <Option value="DONE">Đã xử lý</Option>
            </Select>
          </Form.Item>
          <Form.Item name="reply" label="Phản hồi">
            <Input.TextArea
              rows={4}
              placeholder="Nhập phản hồi cho sinh viên"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default SupportRequestsPage;
