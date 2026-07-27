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
  Tooltip,
  message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { announcementService } from "../../services";

const { Option } = Select;

function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // Get current user info for MANAGER role-based access
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const userRole = authUser?.role;
  const isManager = userRole === "MANAGER";

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await announcementService.getAll({ page: 1, limit: 100 });
      const payload = res?.data;
      setItems(Array.isArray(payload) ? payload : payload?.data || []);
    } catch (err) {
      message.error("Không thể tải thông báo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalVisible(true);
  };
  const openEdit = (record) => {
    // MANAGER: chỉ được sửa thông báo do mình tạo
    if (isManager && record.createdBy !== authUser.userId) {
      message.warning("Bạn chỉ có thể chỉnh sửa thông báo do mình tạo.");
      return;
    }
    setEditing(record);
    form.setFieldsValue({
      title: record.title,
      content: record.content,
      target_role: record.targetRole,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        title: values.title,
        content: values.content,
        target_role: values.target_role,
      };
      if (editing) await announcementService.update(editing.id, payload);
      else await announcementService.create(payload);
      message.success(
        editing ? "Cập nhật thông báo thành công" : "Tạo thông báo thành công",
      );
      setModalVisible(false);
      loadData();
    } catch (err) {
      message.error("Không thể lưu thông báo");
    }
  };

  const handleDelete = (record) => {
    // MANAGER: chỉ được xóa thông báo do mình tạo
    if (isManager && record.createdBy !== authUser.userId) {
      message.warning("Bạn chỉ có thể xóa thông báo do mình tạo.");
      return;
    }
    Modal.confirm({
      title: "Xác nhận xóa thông báo",
      content: `Bạn có chắc chắn muốn xóa thông báo "${record.title}"?`,
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await announcementService.remove(record.id);
          message.success("Xóa thông báo thành công");
          loadData();
        } catch (err) {
          const errMsg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Không thể xóa thông báo";
          message.error(errMsg);
        }
      },
    });
  };

  const isOwn = (record) => {
    if (!isManager) return true; // ADMIN can do everything
    return record.createdBy === authUser.userId;
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Tiêu đề", dataIndex: "title", key: "title" },
    {
      title: "Đối tượng",
      dataIndex: "targetRole",
      key: "targetRole",
      render: (v) => <Tag>{v}</Tag>,
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => {
        const canEdit = isOwn(record);
        return (
          <Space>
            <Tooltip
              title={
                !canEdit
                  ? "Bạn chỉ có thể chỉnh sửa thông báo do mình tạo"
                  : "Chỉnh sửa thông báo"
              }
            >
              <span>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                  disabled={!canEdit}
                  style={
                    !canEdit ? { opacity: 0.4, cursor: "not-allowed" } : {}
                  }
                />
              </span>
            </Tooltip>
            <Tooltip
              title={
                !canEdit
                  ? "Bạn chỉ có thể xóa thông báo do mình tạo"
                  : "Xóa thông báo"
              }
            >
              <span>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                  disabled={!canEdit}
                  style={
                    !canEdit ? { opacity: 0.4, cursor: "not-allowed" } : {}
                  }
                />
              </span>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title="Quản lý thông báo"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Tạo thông báo
        </Button>
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
        title={editing ? "Cập nhật thông báo" : "Tạo thông báo"}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="Lưu"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true }]}
          >
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item
            name="target_role"
            label="Đối tượng"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="ALL">Tất cả</Option>
              <Option value="MANAGER">Quản lý</Option>
              <Option value="STUDENT">Sinh viên</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default AnnouncementsPage;
