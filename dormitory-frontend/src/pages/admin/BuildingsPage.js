import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  HomeOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { buildingService, userService } from "../../services";
import { showSuccess, handleApiError } from "../../utils/toast";
import useConfirmDialog from "../../hooks/useConfirmDialog";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import RetryError from "../../components/common/RetryError";
import { ROLES } from "../../utils/constants";

const { Title, Text } = Typography;
const { Option } = Select;

const GENDER_OPTIONS = [
  { value: "Male", label: "Nam" },
  { value: "Female", label: "Nữ" },
];

const GENDER_LABEL_MAP = {
  Male: "Nam",
  Female: "Nữ",
};

function BuildingsPage() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [genderFilter, setGenderFilter] = useState(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [managers, setManagers] = useState([]);
  const [form] = Form.useForm();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const authUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("authUser") || "{}");
    } catch {
      return {};
    }
  }, []);
  const isAdmin = authUser?.role === ROLES.ADMIN;
  const isManager = authUser?.role === ROLES.MANAGER;

  const fetchBuildings = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        setError(null);
        const response = await buildingService.getAll({
          page,
          limit,
          search: searchText || undefined,
          gender: genderFilter || undefined,
        });
        const data = response.data;
        if (Array.isArray(data)) {
          setBuildings(data);
          setPagination((prev) => ({
            ...prev,
            current: page,
            total: data.length,
          }));
        } else {
          setBuildings(data.data || []);
          setPagination({
            current: data.page || page,
            pageSize: data.limit || limit,
            total: data.total || 0,
          });
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Không thể tải danh sách tòa nhà",
        );
        handleApiError(err, "Không thể tải danh sách tòa nhà");
      } finally {
        setLoading(false);
      }
    },
    [searchText, genderFilter],
  );

  const loadManagers = useCallback(async () => {
    try {
      const response = await userService.getAll({
        page: 1,
        limit: 100,
        role: "MANAGER",
      });
      const data = response.data;
      if (Array.isArray(data)) {
        setManagers(data);
      } else {
        setManagers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchBuildings();
  }, [fetchBuildings]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const handleSearch = () => fetchBuildings(1, pagination.pageSize);

  const handleReset = () => {
    setSearchText("");
    setGenderFilter(undefined);
    setTimeout(() => fetchBuildings(1, pagination.pageSize), 0);
  };

  const openCreateModal = () => {
    loadManagers();
    setEditingBuilding(null);
    setModalVisible(true);
  };

  const openEditModal = (building) => {
    loadManagers();
    setEditingBuilding(building);
    setModalVisible(true);
  };

  const handleModalAfterOpen = () => {
    // Only set form values after modal has opened and Form is mounted
    if (editingBuilding) {
      form.setFieldsValue({
        building_name: editingBuilding.buildingName,
        gender: editingBuilding.gender,
        manager_id: editingBuilding.manager?.id,
        description: editingBuilding.description || "",
      });
    } else {
      form.resetFields();
    }
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleDelete = (building) => {
    confirm({
      title: "Xóa tòa nhà",
      content: `Bạn có chắc chắn muốn xóa tòa nhà "${building.buildingName}"?`,
      danger: true,
      onOk: async () => {
        try {
          await buildingService.remove(building.id);
          showSuccess("Xóa tòa nhà thành công");
          fetchBuildings(pagination.current, pagination.pageSize);
        } catch (err) {
          handleApiError(err, "Không thể xóa tòa nhà");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingBuilding) {
        await buildingService.update(editingBuilding.id, values);
        showSuccess("Cập nhật tòa nhà thành công");
      } else {
        await buildingService.create(values);
        showSuccess("Tạo tòa nhà thành công");
      }
      setModalVisible(false);
      form.resetFields();
      fetchBuildings(pagination.current, pagination.pageSize);
    } catch (err) {
      if (err.errorFields) return;
      handleApiError(
        err,
        editingBuilding
          ? "Không thể cập nhật tòa nhà"
          : "Không thể tạo tòa nhà",
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
    { title: "Tên tòa nhà", dataIndex: "buildingName", key: "buildingName" },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      render: (value) => {
        const label = GENDER_LABEL_MAP[value] || value;
        return <Tag>{label}</Tag>;
      },
    },
    {
      title: "Quản lý",
      key: "manager",
      render: (_, record) => record.manager?.fullName || "—",
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (text) => text || "—",
    },
    ...(isAdmin
      ? [
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
        ]
      : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              <HomeOutlined style={{ marginRight: 8 }} />
              {isAdmin ? "Quản lý tòa nhà" : "Danh sách tòa nhà"}
            </Title>
            <Typography.Text type="secondary">
              {isAdmin
                ? "Quản lý thông tin tòa nhà, giới tính và người phụ trách."
                : "Xem danh sách tòa nhà bạn đang phụ trách quản lý."}
            </Typography.Text>
            {isManager && (
              <div style={{ marginTop: 4 }}>
                <Tag color="orange">Bạn đang ở chế độ Quản lý (MANAGER)</Tag>
                <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>
                  Chỉ xem được thông tin tòa nhà mình phụ trách
                </Text>
              </div>
            )}
          </Col>
          {isAdmin && (
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                Tạo tòa nhà
              </Button>
            </Col>
          )}
        </Row>
      </Card>
      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Tên tòa nhà"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Giới tính"
              value={genderFilter}
              onChange={setGenderFilter}
              allowClear
              style={{ width: "100%" }}
            >
              {GENDER_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              block
            >
              Tìm
            </Button>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Button icon={<ReloadOutlined />} onClick={handleReset} block>
              Reset
            </Button>
          </Col>
        </Row>
        {loading ? (
          <LoadingState message="Đang tải danh sách tòa nhà..." />
        ) : error ? (
          <RetryError message={error} onRetry={() => fetchBuildings()} />
        ) : buildings.length === 0 ? (
          <EmptyState
            title="Chưa có tòa nhà nào"
            description={
              isAdmin
                ? "Nhấn 'Tạo tòa nhà' để thêm mới."
                : "Hiện tại bạn chưa được phân công quản lý tòa nhà nào."
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={buildings}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} của ${total} tòa nhà`,
            }}
            onChange={(pag) => fetchBuildings(pag.current, pag.pageSize)}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
      <Modal
        title={editingBuilding ? "Chỉnh sửa tòa nhà" : "Tạo tòa nhà mới"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleModalCancel}
        afterOpenChange={handleModalAfterOpen}
        confirmLoading={submitting}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tên tòa nhà"
            name="building_name"
            rules={[{ required: true, message: "Vui lòng nhập tên tòa nhà" }]}
          >
            <Input placeholder="Nhập tên tòa nhà" maxLength={100} showCount />
          </Form.Item>
          <Form.Item
            label="Giới tính"
            name="gender"
            rules={[{ required: true, message: "Vui lòng chọn giới tính" }]}
          >
            <Select placeholder="Chọn giới tính">
              {GENDER_OPTIONS.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="Quản lý"
            name="manager_id"
            rules={[{ required: true, message: "Vui lòng chọn quản lý" }]}
          >
            <Select placeholder="Chọn người quản lý">
              {managers.map((manager) => (
                <Option key={manager.id} value={manager.id}>
                  {manager.fullName || manager.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item label="Mô tả" name="description">
            <Input.TextArea rows={4} placeholder="Nhập mô tả tòa nhà" />
          </Form.Item>
        </Form>
      </Modal>
      <ConfirmDialog />
    </div>
  );
}

export default BuildingsPage;
