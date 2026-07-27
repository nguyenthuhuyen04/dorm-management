import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  DatePicker,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { studentService, userService } from "../../services";
import { showSuccess, handleApiError } from "../../utils/toast";
import useConfirmDialog from "../../hooks/useConfirmDialog";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import RetryError from "../../components/common/RetryError";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

const GENDER_OPTIONS = [
  { value: "Male", label: "Nam" },
  { value: "Female", label: "Nữ" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động", color: "green" },
  { value: "INACTIVE", label: "Ngừng hoạt động", color: "default" },
];

const GENDER_LABEL_MAP = {
  Male: "Nam",
  Female: "Nữ",
};

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [studentUsers, setStudentUsers] = useState([]);
  const [form] = Form.useForm();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const fetchStudents = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        setError(null);
        const response = await studentService.getAll({
          page,
          limit,
          search: searchText || undefined,
          building: buildingFilter || undefined,
          room: roomFilter || undefined,
          course: courseFilter || undefined,
          gender: genderFilter || undefined,
        });
        const data = response.data;

        if (Array.isArray(data)) {
          setStudents(data);
          setPagination((prev) => ({
            ...prev,
            current: page,
            total: data.length,
          }));
        } else {
          setStudents(data.data || []);
          setPagination({
            current: data.page || page,
            pageSize: data.limit || limit,
            total: data.total || 0,
          });
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Không thể tải danh sách sinh viên",
        );
        handleApiError(err, "Không thể tải danh sách sinh viên");
      } finally {
        setLoading(false);
      }
    },
    [searchText, buildingFilter, roomFilter, courseFilter, genderFilter],
  );

  const loadStudentUsers = useCallback(async () => {
    try {
      const response = await userService.getAll({
        page: 1,
        limit: 1000,
        role: "STUDENT",
      });
      const data = response.data;
      const users = Array.isArray(data) ? data : data.data || [];
      setStudentUsers(users);
    } catch (err) {
      console.error("Failed to load student users:", err);
      handleApiError(err, "Không thể tải danh sách tài khoản sinh viên");
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    loadStudentUsers();
  }, [loadStudentUsers]);

  const handleSearch = () => fetchStudents(1, pagination.pageSize);

  const handleReset = () => {
    setSearchText("");
    setBuildingFilter("");
    setRoomFilter("");
    setCourseFilter("");
    setGenderFilter(undefined);
    setTimeout(() => fetchStudents(1, pagination.pageSize), 0);
  };

  const openCreateModal = () => {
    loadStudentUsers();
    setEditingStudent(null);
    form.resetFields();
    form.setFieldsValue({ gender: "Male", status: "ACTIVE" });
    setModalVisible(true);
  };

  const openEditModal = (student) => {
    loadStudentUsers();
    setEditingStudent(student);
    form.setFieldsValue({
      user_id: student.user?.id || student.userId,
      student_code: student.studentCode,
      email: student.user?.email || "",
      phone: student.user?.phone || "",
      gender: student.gender || "Male",
      birthday: student.birthday ? dayjs(student.birthday) : null,
      faculty: student.faculty || "",
      class_name: student.className || "",
      address: student.address || "",
      parent_phone: student.parentPhone || "",
      status: student.user?.status || "ACTIVE",
    });
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleDelete = (student) => {
    confirm({
      title: "Xóa sinh viên",
      content: `Bạn có chắc chắn muốn vô hiệu hóa sinh viên "${student.user?.fullName || student.studentCode}"?`,
      danger: true,
      onOk: async () => {
        try {
          await studentService.remove(student.id);
          showSuccess("Vô hiệu hóa sinh viên thành công");
          fetchStudents(pagination.current, pagination.pageSize);
        } catch (err) {
          handleApiError(err, "Không thể vô hiệu hóa sinh viên");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const payload = {
        user_id: values.user_id,
        student_code: values.student_code,
        email: values.email || undefined,
        phone: values.phone || undefined,
        gender: values.gender,
        birthday: values.birthday
          ? values.birthday.format("YYYY-MM-DD")
          : undefined,
        faculty: values.faculty || undefined,
        class_name: values.class_name || undefined,
        address: values.address || undefined,
        parent_phone: values.parent_phone || undefined,
      };

      if (editingStudent) {
        await studentService.update(editingStudent.id, payload);
        showSuccess("Cập nhật sinh viên thành công");
      } else {
        await studentService.create(payload);
        showSuccess("Tạo sinh viên thành công");
      }

      setModalVisible(false);
      form.resetFields();
      fetchStudents(pagination.current, pagination.pageSize);
    } catch (err) {
      if (err.errorFields) return;
      handleApiError(
        err,
        editingStudent
          ? "Không thể cập nhật sinh viên"
          : "Không thể tạo sinh viên",
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
      title: "Mã sinh viên",
      dataIndex: "studentCode",
      key: "studentCode",
    },
    {
      title: "Họ và tên",
      key: "fullName",
      render: (_, record) => record.user?.fullName || "—",
    },
    {
      title: "Email",
      key: "email",
      render: (_, record) => record.user?.email || "—",
    },
    {
      title: "Số điện thoại",
      key: "phone",
      render: (_, record) => record.user?.phone || "—",
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      render: (value) => <Tag>{GENDER_LABEL_MAP[value] || value || "—"}</Tag>,
    },
    {
      title: "Khoa",
      dataIndex: "faculty",
      key: "faculty",
      render: (value) => value || "—",
    },
    {
      title: "Lớp",
      dataIndex: "className",
      key: "className",
      render: (value) => value || "—",
    },
    {
      title: "Trạng thái",
      key: "status",
      render: (_, record) => {
        const option = STATUS_OPTIONS.find(
          (item) => item.value === record.user?.status,
        );
        return (
          <Tag color={option?.color}>
            {option?.label || record.user?.status || "—"}
          </Tag>
        );
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
          <Tooltip title="Vô hiệu hóa">
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
              Quản lý sinh viên
            </Title>
            <Typography.Text type="secondary">
              Quản lý hồ sơ sinh viên, thông tin cá nhân và trạng thái tài
              khoản.
            </Typography.Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateModal}
            >
              Thêm sinh viên
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Row gutter={12} align="middle">
          <Col flex="1">
            <Input
              placeholder="Tìm kiếm theo mã sinh viên, tên, khoa, lớp"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col>
            <Button icon={<SearchOutlined />} onClick={handleSearch}>
              Tìm kiếm
            </Button>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Reset
            </Button>
          </Col>
        </Row>
        <Row gutter={12} style={{ marginTop: 12 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Lọc theo tòa nhà"
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Lọc theo phòng"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Lọc theo khóa/lớp"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Lọc theo giới tính"
              value={genderFilter}
              onChange={setGenderFilter}
              allowClear
              style={{ width: "100%" }}
            >
              {GENDER_OPTIONS.map((item) => (
                <Option key={item.value} value={item.value}>
                  {item.label}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      <Card>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <RetryError
            message={error}
            onRetry={() =>
              fetchStudents(pagination.current, pagination.pageSize)
            }
          />
        ) : students.length === 0 ? (
          <EmptyState
            title="Không có sinh viên"
            description="Chưa có dữ liệu sinh viên nào."
          />
        ) : (
          <Table
            rowKey="id"
            dataSource={students}
            columns={columns}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              onChange: (page, pageSize) => fetchStudents(page, pageSize),
            }}
          />
        )}
      </Card>

      <Modal
        title={editingStudent ? "Cập nhật sinh viên" : "Thêm sinh viên"}
        open={modalVisible}
        onCancel={handleModalCancel}
        confirmLoading={submitting}
        onOk={handleSubmit}
        okText={editingStudent ? "Cập nhật" : "Tạo mới"}
        width={760}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="user_id"
                label="Tài khoản sinh viên"
                rules={[{ required: true, message: "Vui lòng chọn tài khoản" }]}
              >
                <Select
                  placeholder="Chọn tài khoản sinh viên"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {studentUsers.map((user) => (
                    <Option key={user.id} value={user.id}>
                      {user.fullName || user.username}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="student_code"
                label="Mã sinh viên"
                rules={[
                  { required: true, message: "Vui lòng nhập mã sinh viên" },
                ]}
              >
                <Input maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Số điện thoại">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="gender" label="Giới tính">
                <Select>
                  {GENDER_OPTIONS.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="birthday" label="Ngày sinh">
                <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái" hidden={true}>
                <Select>
                  {STATUS_OPTIONS.map((item) => (
                    <Option key={item.value} value={item.value}>
                      {item.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="faculty" label="Khoa">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="class_name" label="Lớp">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="parent_phone" label="Số điện thoại phụ huynh">
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDialog />
    </div>
  );
}

export default StudentsPage;
