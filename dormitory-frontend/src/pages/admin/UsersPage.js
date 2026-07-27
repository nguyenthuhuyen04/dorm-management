import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Typography,
  Modal,
  Form,
  Row,
  Col,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ReloadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { userService } from "../../services";
import { showSuccess, handleApiError } from "../../utils/toast";
import useConfirmDialog from "../../hooks/useConfirmDialog";
import { userRules } from "../../utils/validation";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import RetryError from "../../components/common/RetryError";

const { Title } = Typography;
const { Option } = Select;

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Quản trị viên", color: "red" },
  { value: "MANAGER", label: "Quản lý", color: "orange" },
  { value: "STUDENT", label: "Sinh viên", color: "blue" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động", color: "green" },
  { value: "INACTIVE", label: "Ngừng hoạt động", color: "default" },
];

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchParams, setSearchParams] = useState({
    username: "",
    email: "",
    full_name: "",
    role: undefined,
    status: undefined,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const fetchUsers = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        setError(null);
        const params = { page, limit };
        if (searchParams.username) params.username = searchParams.username;
        if (searchParams.email) params.email = searchParams.email;
        if (searchParams.full_name) params.full_name = searchParams.full_name;
        if (searchParams.role) params.role = searchParams.role;
        if (searchParams.status) params.status = searchParams.status;

        const response = await userService.getAll(params);
        const data = response.data;

        if (Array.isArray(data)) {
          setUsers(data);
          setPagination((prev) => ({
            ...prev,
            current: page,
            total: data.length,
          }));
        } else {
          setUsers(data.data || []);
          setPagination({
            current: data.page || page,
            pageSize: data.limit || limit,
            total: data.total || 0,
          });
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Không thể tải danh sách người dùng",
        );
        handleApiError(err, "Không thể tải danh sách người dùng");
      } finally {
        setLoading(false);
      }
    },
    [searchParams],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    fetchUsers(1, pagination.pageSize);
  };

  const handleReset = () => {
    setSearchParams({
      username: "",
      email: "",
      full_name: "",
      role: undefined,
      status: undefined,
    });
  };

  useEffect(() => {
    if (
      !searchParams.username &&
      !searchParams.email &&
      !searchParams.full_name &&
      !searchParams.role &&
      !searchParams.status
    ) {
      fetchUsers();
    }
  }, [searchParams, fetchUsers]);

  const handleTableChange = (pag) => {
    fetchUsers(pag.current, pag.pageSize);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setModalVisible(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setModalVisible(true);
  };

  const handleModalOpenChange = (visible) => {
    if (!visible) {
      setModalVisible(false);
      form.resetFields();
      return;
    }

    if (editingUser) {
      form.setFieldsValue({
        username: editingUser.username,
        full_name: editingUser.fullName || "",
        email: editingUser.email,
        phone: editingUser.phone || "",
        role: editingUser.role,
        status: editingUser.status,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ role: "STUDENT", status: "ACTIVE" });
    }
  };

  const handleDelete = (user) => {
    confirm({
      title: "Xóa người dùng",
      content: `Bạn có chắc chắn muốn xóa người dùng "${user.username}"?`,
      danger: true,
      onOk: async () => {
        try {
          await userService.remove(user.id);
          showSuccess("Xóa người dùng thành công");
          fetchUsers(pagination.current, pagination.pageSize);
        } catch (err) {
          handleApiError(err, "Không thể xóa người dùng");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingUser) {
        const payload = { ...values };
        if (!payload.password) delete payload.password;
        await userService.update(editingUser.id, payload);
        showSuccess("Cập nhật người dùng thành công");
      } else {
        await userService.create(values);
        showSuccess("Tạo người dùng thành công");
      }

      setModalVisible(false);
      form.resetFields();
      fetchUsers(pagination.current, pagination.pageSize);
    } catch (err) {
      if (err.errorFields) return; // Validation error
      handleApiError(
        err,
        editingUser
          ? "Không thể cập nhật người dùng"
          : "Không thể tạo người dùng",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Tên đăng nhập",
      dataIndex: "username",
      key: "username",
      sorter: true,
    },
    {
      title: "Họ và tên",
      dataIndex: "fullName",
      key: "fullName",
      render: (text) => text || "-",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Số điện thoại",
      dataIndex: "phone",
      key: "phone",
      render: (text) => text || "-",
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      render: (role) => {
        const option = ROLE_OPTIONS.find((o) => o.value === role);
        return <Tag color={option?.color}>{option?.label || role}</Tag>;
      },
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const option = STATUS_OPTIONS.find((o) => o.value === status);
        return <Tag color={option?.color}>{option?.label || status}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              <UserOutlined style={{ marginRight: 8 }} />
              Quản lý người dùng
            </Title>
            <Typography.Text type="secondary">
              Quản lý tài khoản người dùng trong hệ thống. Chỉ ADMIN mới có
              quyền tạo và chỉnh sửa.
            </Typography.Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              Tạo người dùng
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tên đăng nhập"
              prefix={<SearchOutlined />}
              value={searchParams.username}
              onChange={(e) =>
                setSearchParams((prev) => ({
                  ...prev,
                  username: e.target.value,
                }))
              }
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Email"
              prefix={<SearchOutlined />}
              value={searchParams.email}
              onChange={(e) =>
                setSearchParams((prev) => ({ ...prev, email: e.target.value }))
              }
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Vai trò"
              value={searchParams.role}
              onChange={(value) =>
                setSearchParams((prev) => ({ ...prev, role: value }))
              }
              allowClear
              style={{ width: "100%" }}
            >
              {ROLE_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder="Trạng thái"
              value={searchParams.status}
              onChange={(value) =>
                setSearchParams((prev) => ({ ...prev, status: value }))
              }
              allowClear
              style={{ width: "100%" }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={2}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              block
            >
              Tìm
            </Button>
          </Col>
          <Col xs={12} sm={6} md={2}>
            <Button icon={<ReloadOutlined />} onClick={handleReset} block>
              Reset
            </Button>
          </Col>
        </Row>

        {loading ? (
          <LoadingState message="Đang tải danh sách người dùng..." />
        ) : error ? (
          <RetryError message={error} onRetry={() => fetchUsers()} />
        ) : users.length === 0 ? (
          <EmptyState
            title="Chưa có người dùng nào"
            description="Nhấn 'Tạo người dùng' để thêm tài khoản mới."
          />
        ) : (
          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} của ${total} người dùng`,
            }}
            onChange={handleTableChange}
            scroll={{ x: 900 }}
          />
        )}
      </Card>

      <Modal
        title={editingUser ? "Chỉnh sửa người dùng" : "Tạo người dùng mới"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => handleModalOpenChange(false)}
        afterOpenChange={handleModalOpenChange}
        confirmLoading={submitting}
        width={600}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Tên đăng nhập"
                name="username"
                rules={userRules.username}
              >
                <Input
                  disabled={!!editingUser}
                  placeholder="Nhập tên đăng nhập"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Họ và tên"
                name="full_name"
                rules={userRules.fullName}
              >
                <Input placeholder="Nhập họ và tên" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Email" name="email" rules={userRules.email}>
                <Input placeholder="Nhập email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Số điện thoại"
                name="phone"
                rules={userRules.phone}
              >
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
          </Row>

          {!editingUser && (
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={userRules.password}
            >
              <Input.Password placeholder="Nhập mật khẩu" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Vai trò"
                name="role"
                rules={[{ required: true, message: "Vui lòng chọn vai trò" }]}
              >
                <Select placeholder="Chọn vai trò">
                  {ROLE_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Trạng thái"
                name="status"
                rules={[
                  { required: true, message: "Vui lòng chọn trạng thái" },
                ]}
              >
                <Select placeholder="Chọn trạng thái">
                  {STATUS_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <ConfirmDialog />
    </div>
  );
}

export default UsersPage;
