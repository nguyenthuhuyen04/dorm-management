import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
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
  EyeOutlined,
  HomeOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { roomService, buildingService } from "../../services";
import { showSuccess, handleApiError } from "../../utils/toast";
import useConfirmDialog from "../../hooks/useConfirmDialog";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import RetryError from "../../components/common/RetryError";
import { ROLES } from "../../utils/constants";

const { Title, Text } = Typography;
const { Option } = Select;

const GENDER_MAP = {
  Male: "Nam",
  Female: "Nữ",
};

const STATUS_MAP = {
  ACTIVE: { color: "green", label: "Đang hoạt động" },
  MAINTENANCE: { color: "orange", label: "Bảo trì" },
};

function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [filterBuilding, setFilterBuilding] = useState(undefined);
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [filterGender, setFilterGender] = useState(undefined);
  const [filterFloor, setFilterFloor] = useState(undefined);
  const [filterRoomType, setFilterRoomType] = useState(undefined);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [submitting, setSubmitting] = useState(false);
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
  const canCreateOrEdit = isAdmin || isManager;

  const filterValuesRef = useRef({
    searchText,
    filterBuilding,
    filterStatus,
    filterGender,
    filterFloor,
    filterRoomType,
  });

  useEffect(() => {
    filterValuesRef.current = {
      searchText,
      filterBuilding,
      filterStatus,
      filterGender,
      filterFloor,
      filterRoomType,
    };
  }, [
    searchText,
    filterBuilding,
    filterStatus,
    filterGender,
    filterFloor,
    filterRoomType,
  ]);

  const fetchRooms = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const {
        searchText: currentSearchText,
        filterBuilding: currentFilterBuilding,
        filterStatus: currentFilterStatus,
        filterGender: currentFilterGender,
        filterFloor: currentFilterFloor,
        filterRoomType: currentFilterRoomType,
      } = filterValuesRef.current;

      const params = { page, limit };
      if (currentSearchText) params.search = currentSearchText;
      if (currentFilterBuilding) params.building_id = currentFilterBuilding;
      if (currentFilterStatus) params.status = currentFilterStatus;
      if (currentFilterGender) params.gender = currentFilterGender;
      if (currentFilterFloor) params.floor = currentFilterFloor;
      if (currentFilterRoomType) params.room_type = currentFilterRoomType;

      const res = await roomService.getAll(params);
      const payload = res?.data;
      if (Array.isArray(payload)) {
        setRooms(payload);
        setPagination((prev) => ({
          ...prev,
          current: page,
          total: payload.length,
        }));
      } else {
        setRooms(payload?.data || []);
        setPagination({
          current: payload?.page || page,
          pageSize: payload?.limit || limit,
          total: payload?.total || 0,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Không thể tải danh sách phòng");
      handleApiError(err, "Không thể tải danh sách phòng");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBuildings = useCallback(async () => {
    try {
      const res = await buildingService.getAll({ page: 1, limit: 100 });
      const data = res?.data;
      if (Array.isArray(data)) {
        setBuildings(data);
      } else {
        setBuildings(data?.data || []);
      }
    } catch (err) {
      // Không hiển thị lỗi building vì đây là dữ liệu phụ
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchBuildings();
  }, [fetchBuildings, fetchRooms]);

  const handleSearch = () => fetchRooms(1, pagination.pageSize);

  const handleReset = () => {
    setSearchText("");
    setFilterBuilding(undefined);
    setFilterStatus(undefined);
    setFilterGender(undefined);
    setFilterFloor(undefined);
    setFilterRoomType(undefined);
    setTimeout(() => fetchRooms(1, pagination.pageSize), 0);
  };

  const openCreateModal = () => {
    setEditingRoom(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingRoom(record);
    form.setFieldsValue({
      building_id: record.buildingId,
      room_number: record.roomNumber,
      floor: record.floor,
      room_type: record.roomType,
      gender: record.gender,
      capacity: record.capacity,
      room_fee: record.roomFee,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    form.resetFields();
  };

  const handleDelete = (record) => {
    confirm({
      title: "Xóa phòng",
      content: (
        <div>
          <p>
            Bạn có chắc chắn muốn xóa phòng <strong>{record.roomNumber}</strong>{" "}
            thuộc tòa{" "}
            <strong>
              {record.building?.buildingName || `#${record.buildingId}`}
            </strong>
            ?
          </p>
          <p style={{ color: "#fa8c16", fontSize: 13, marginTop: 8 }}>
            ⚠️ Lưu ý: Không thể xóa phòng nếu còn hợp đồng đang hoạt động.
          </p>
        </div>
      ),
      danger: true,
      onOk: async () => {
        try {
          await roomService.remove(record.id);
          showSuccess("Xóa phòng thành công");
          fetchRooms(pagination.current, pagination.pageSize);
        } catch (err) {
          handleApiError(err, "Không thể xóa phòng");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (values.capacity && values.capacity < 1) {
        form.setFields([
          { name: "capacity", errors: ["Sức chứa phải lớn hơn 0"] },
        ]);
        return;
      }
      if (values.floor && values.floor < 1) {
        form.setFields([
          { name: "floor", errors: ["Tầng phải lớn hơn hoặc bằng 1"] },
        ]);
        return;
      }
      if (values.room_fee !== undefined && values.room_fee < 0) {
        form.setFields([
          { name: "room_fee", errors: ["Giá phòng không được âm"] },
        ]);
        return;
      }

      const payload = {
        building_id: values.building_id,
        room_number: values.room_number,
        floor: values.floor,
        room_type: values.room_type || null,
        gender: values.gender || null,
        capacity: values.capacity,
        room_fee: values.room_fee,
        status: values.status || "ACTIVE",
      };

      if (editingRoom) {
        await roomService.update(editingRoom.id, payload);
        showSuccess("Cập nhật phòng thành công");
      } else {
        await roomService.create(payload);
        showSuccess("Tạo phòng thành công");
      }
      setModalVisible(false);
      form.resetFields();
      fetchRooms(pagination.current, pagination.pageSize);
    } catch (err) {
      if (err.errorFields) return;
      handleApiError(
        err,
        editingRoom ? "Không thể cập nhật phòng" : "Không thể tạo phòng",
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
      title: "Phòng",
      dataIndex: "roomNumber",
      key: "roomNumber",
      width: 100,
    },
    {
      title: "Tòa nhà",
      key: "building",
      width: 120,
      render: (_, record) =>
        record.building?.buildingName || `#${record.buildingId}`,
    },
    {
      title: "Tầng",
      dataIndex: "floor",
      key: "floor",
      width: 70,
    },
    {
      title: "Loại phòng",
      dataIndex: "roomType",
      key: "roomType",
      width: 100,
      render: (val) => val || "—",
    },
    {
      title: "Giới tính",
      dataIndex: "gender",
      key: "gender",
      width: 120,
      render: (gender) =>
        gender ? (
          <Tag>{GENDER_MAP[gender] || gender}</Tag>
        ) : (
          <Tag>Không phân biệt</Tag>
        ),
    },
    {
      title: "Sức chứa",
      key: "occupancy",
      width: 140,
      render: (_, record) => {
        const current = record.currentOccupancy ?? 0;
        const capacity = record.capacity ?? 0;
        const available =
          record.availableSlots ?? Math.max(capacity - current, 0);
        const isFull = available <= 0;
        return (
          <Tooltip title={`Còn ${available} chỗ trống`}>
            <span
              style={{
                fontWeight: 500,
                color: isFull ? "#ff4d4f" : "#52c41a",
              }}
            >
              {current}/{capacity}
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
                (còn {available})
              </Text>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Giá phòng",
      dataIndex: "roomFee",
      key: "roomFee",
      width: 120,
      render: (fee) =>
        fee != null
          ? Number(fee).toLocaleString("vi-VN", {
              style: "currency",
              currency: "VND",
            })
          : "—",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => {
        const config = STATUS_MAP[status] || {
          color: "default",
          label: status,
        };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Thao tác",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button type="link" icon={<EyeOutlined />} size="small" />
          </Tooltip>
          {canCreateOrEdit && (
            <Tooltip title="Chỉnh sửa">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
                size="small"
              />
            </Tooltip>
          )}
          {canCreateOrEdit && (
            <Tooltip title="Xóa">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
                size="small"
              />
            </Tooltip>
          )}
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
              <HomeOutlined style={{ marginRight: 8 }} />
              {isAdmin ? "Quản lý phòng" : "Danh sách phòng"}
            </Title>
            <Typography.Text type="secondary">
              {isAdmin
                ? "Quản lý thông tin các phòng trong ký túc xá."
                : "Xem danh sách phòng bạn đang phụ trách quản lý."}
            </Typography.Text>
          </Col>
          {canCreateOrEdit && (
            <Col>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                Tạo phòng
              </Button>
            </Col>
          )}
        </Row>

        {isManager && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 16px",
              background: "#fff7e6",
              border: "1px solid #ffd591",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Tag color="orange" style={{ marginRight: 0 }}>
              Chế độ quản lý
            </Tag>
            <Text style={{ fontSize: 13, color: "#d46b08" }}>
              Bạn chỉ xem và thao tác với phòng thuộc các tòa nhà bạn được phân
              công phụ trách.
            </Text>
          </div>
        )}
      </Card>

      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm phòng (số phòng, tên tòa)..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Select
              placeholder="Tòa nhà"
              value={filterBuilding}
              onChange={setFilterBuilding}
              allowClear
              style={{ width: "100%" }}
            >
              {buildings.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.buildingName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Select
              placeholder="Trạng thái"
              value={filterStatus}
              onChange={setFilterStatus}
              allowClear
              style={{ width: "100%" }}
            >
              <Option value="ACTIVE">Đang hoạt động</Option>
              <Option value="MAINTENANCE">Bảo trì</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={3}>
            <Select
              placeholder="Giới tính"
              value={filterGender}
              onChange={setFilterGender}
              allowClear
              style={{ width: "100%" }}
            >
              <Option value="Male">Nam</Option>
              <Option value="Female">Nữ</Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={2}>
            <InputNumber
              placeholder="Tầng"
              value={filterFloor}
              onChange={setFilterFloor}
              min={1}
              style={{ width: "100%" }}
            />
          </Col>
          <Col xs={12} sm={6} md={2}>
            <Input
              placeholder="Loại phòng"
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              allowClear
              style={{ width: "100%" }}
            />
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
      </Card>

      <Card>
        {loading ? (
          <LoadingState message="Đang tải danh sách phòng..." />
        ) : error ? (
          <RetryError
            message={error}
            description="Vui lòng kiểm tra kết nối và thử lại."
            onRetry={() => fetchRooms()}
          />
        ) : rooms.length === 0 ? (
          <EmptyState
            description={
              isAdmin
                ? "Nhấn 'Tạo phòng' để thêm phòng mới."
                : "Hiện tại chưa có phòng nào trong tòa nhà bạn quản lý."
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={rooms}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} của ${total} phòng`,
            }}
            onChange={(pag) => fetchRooms(pag.current, pag.pageSize)}
            scroll={{ x: 1100 }}
            size="middle"
          />
        )}
      </Card>

      <Modal
        title={editingRoom ? "Cập nhật phòng" : "Tạo phòng mới"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={handleModalCancel}
        confirmLoading={submitting}
        width={640}
        destroyOnHidden
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 16 }}
          initialValues={{ status: "ACTIVE" }}
        >
          <Form.Item
            name="building_id"
            label="Tòa nhà"
            rules={[{ required: true, message: "Vui lòng chọn tòa nhà" }]}
          >
            <Select placeholder="Chọn tòa nhà">
              {buildings.map((b) => (
                <Option key={b.id} value={b.id}>
                  {b.buildingName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="room_number"
                label="Số phòng"
                rules={[
                  { required: true, message: "Vui lòng nhập số phòng" },
                  { max: 20, message: "Số phòng tối đa 20 ký tự" },
                ]}
              >
                <Input placeholder="VD: A101" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="floor"
                label="Tầng"
                rules={[
                  { required: true, message: "Vui lòng nhập tầng" },
                  {
                    type: "number",
                    min: 1,
                    message: "Tầng phải lớn hơn hoặc bằng 1",
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  placeholder="VD: 1"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="room_type" label="Loại phòng">
                <Input placeholder="VD: Phòng đôi" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="gender" label="Giới tính">
                <Select
                  placeholder="Chọn giới tính (không bắt buộc)"
                  allowClear
                >
                  <Option value="Male">Nam</Option>
                  <Option value="Female">Nữ</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="capacity"
                label="Sức chứa"
                rules={[
                  { required: true, message: "Vui lòng nhập sức chứa" },
                  {
                    type: "number",
                    min: 1,
                    message: "Sức chứa phải lớn hơn 0",
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{ width: "100%" }}
                  placeholder="VD: 6"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="room_fee"
                label="Giá phòng (VNĐ)"
                rules={[
                  { required: true, message: "Vui lòng nhập giá phòng" },
                  {
                    type: "number",
                    min: 0,
                    message: "Giá phòng không được âm",
                  },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: "100%" }}
                  placeholder="VD: 500000"
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  parser={(value) => value.replace(/,/g, "")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="Trạng thái">
            <Select placeholder="Chọn trạng thái">
              <Option value="ACTIVE">Đang hoạt động</Option>
              <Option value="MAINTENANCE">Bảo trì</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <ConfirmDialog />
    </div>
  );
}

export default RoomsPage;
