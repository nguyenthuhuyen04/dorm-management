import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Row,
  Col,
  Tooltip,
  message,
  Typography,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { utilityBillService, roomService } from "../../services";
import {
  canDeleteUtilityBills,
  canManageUtilityBills,
  getCurrentUserRole,
} from "../../utils/permissions";

const { Text } = Typography;

const { Option } = Select;

const STATUS_MAP = {
  DRAFT: { color: "orange", label: "Bản nháp" },
  PUBLISHED: { color: "green", label: "Đã xuất bản" },
};

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

function UtilityBillsPage() {
  const [bills, setBills] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const currentRole = getCurrentUserRole();
  const canDelete = canDeleteUtilityBills(currentRole);
  const canManage = canManageUtilityBills(currentRole);

  // Pagination
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Search & Filters
  const [searchText, setSearchText] = useState("");
  const [filterMonth, setFilterMonth] = useState(undefined);
  const [filterYear, setFilterYear] = useState(undefined);
  const [filterStatus, setFilterStatus] = useState(undefined);

  const loadData = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const params = { page, limit: pageSize };
        if (searchText) params.search = searchText;
        if (filterMonth) params.month = filterMonth;
        if (filterYear) params.year = filterYear;
        if (filterStatus) params.status = filterStatus;

        const [billRes, roomRes] = await Promise.all([
          utilityBillService.getAll(params),
          roomService.getAll({ page: 1, limit: 1000 }),
        ]);

        const responseData = billRes?.data;
        setBills(responseData?.data || []);
        setPagination({
          current: responseData?.page || page,
          pageSize: responseData?.limit || pageSize,
          total: responseData?.total || 0,
        });
        setRooms(
          Array.isArray(roomRes?.data)
            ? roomRes.data
            : roomRes?.data?.data || [],
        );
      } catch (err) {
        message.error("Không thể tải hóa đơn tiện ích");
        setBills([]);
      } finally {
        setLoading(false);
      }
    },
    [searchText, filterMonth, filterYear, filterStatus],
  );

  useEffect(() => {
    loadData(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-reload when filters change (debounced by useCallback deps)
  useEffect(() => {
    loadData(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, filterMonth, filterYear, filterStatus]);

  const handleTableChange = useCallback(
    (pag) => {
      loadData(pag.current, pag.pageSize);
    },
    [loadData],
  );

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }));
    loadData(1, pagination.pageSize);
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      room_id: record.roomId,
      month: record.month,
      year: record.year,
      electric_old: record.electricOld,
      electric_new: record.electricNew,
      water_old: record.waterOld,
      water_new: record.waterNew,
      electric_fee: record.electricFee,
      water_fee: record.waterFee,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        room_id: values.room_id,
        month: values.month,
        year: values.year,
        electric_old: values.electric_old,
        electric_new: values.electric_new,
        water_old: values.water_old,
        water_new: values.water_new,
        electric_fee: values.electric_fee,
        water_fee: values.water_fee,
        status: values.status,
      };
      if (editing) await utilityBillService.update(editing.id, payload);
      else await utilityBillService.create(payload);
      message.success(
        editing ? "Cập nhật hóa đơn thành công" : "Tạo hóa đơn thành công",
      );
      setModalVisible(false);
      loadData(pagination.current, pagination.pageSize);
    } catch (err) {
      message.error("Không thể lưu hóa đơn");
    }
  };

  const handleDelete = (record) => {
    const isPublished = record.status === "PUBLISHED";
    const hasPayments = record.payments && record.payments.length > 0;

    Modal.confirm({
      title: "Xác nhận xóa hóa đơn",
      icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
      content: (
        <div style={{ marginTop: 12 }}>
          <p>
            <Text strong>Phòng:</Text>{" "}
            {record.room?.roomNumber || record.roomId}
          </p>
          <p>
            <Text strong>Kỳ:</Text> {record.month}/{record.year}
          </p>
          <p>
            <Text strong>Trạng thái:</Text>{" "}
            <Tag color={STATUS_MAP[record.status]?.color}>
              {STATUS_MAP[record.status]?.label || record.status}
            </Tag>
          </p>
          {isPublished && hasPayments && (
            <p style={{ color: "#ff4d4f", marginTop: 12 }}>
              <ExclamationCircleOutlined style={{ marginRight: 4 }} />
              Hóa đơn đã xuất bản và có thanh toán liên quan - không thể xóa.
            </p>
          )}
          {isPublished && !hasPayments && (
            <p style={{ color: "#ff4d4f", marginTop: 12 }}>
              Hóa đơn đã xuất bản. Bạn có chắc chắn muốn xóa?
            </p>
          )}
          {!isPublished && (
            <p style={{ color: "#ff4d4f", marginTop: 12 }}>
              Hành động này không thể hoàn tác.
            </p>
          )}
        </div>
      ),
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      okButtonProps: { disabled: isPublished && hasPayments },
      onOk: async () => {
        try {
          await utilityBillService.remove(record.id);
          message.success("Xóa hóa đơn thành công");
          loadData(pagination.current, pagination.pageSize);
        } catch (err) {
          const errMsg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            "Không thể xóa hóa đơn";
          message.error(errMsg);
        }
      },
    });
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "Phòng",
      key: "room",
      render: (_, r) => r.room?.roomNumber || r.roomId,
    },
    {
      title: "Tòa nhà",
      key: "building",
      render: (_, r) => r.room?.building?.buildingName || "—",
      responsive: ["lg", "xl"],
    },
    {
      title: "Tháng/Năm",
      key: "monthYear",
      render: (_, r) => `${r.month}/${r.year}`,
    },
    {
      title: "Điện cũ",
      dataIndex: "electricOld",
      key: "electricOld",
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Điện mới",
      dataIndex: "electricNew",
      key: "electricNew",
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Nước cũ",
      dataIndex: "waterOld",
      key: "waterOld",
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Nước mới",
      dataIndex: "waterNew",
      key: "waterNew",
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Tiền điện",
      dataIndex: "electricFee",
      key: "electricFee",
      render: (val) => formatCurrency(val),
      responsive: ["lg", "xl"],
    },
    {
      title: "Tiền nước",
      dataIndex: "waterFee",
      key: "waterFee",
      render: (val) => formatCurrency(val),
      responsive: ["lg", "xl"],
    },
    {
      title: "Tổng tiền",
      key: "total",
      render: (_, r) => <strong>{formatCurrency(r.total)}</strong>,
    },
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
      width: 120,
      render: (_, record) => {
        const isPublished = record.status === "PUBLISHED";
        return (
          <Space size="small">
            <Tooltip
              title={
                isPublished
                  ? "Đã xuất bản - không thể chỉnh sửa"
                  : "Chỉnh sửa hóa đơn"
              }
            >
              <span>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                  size="small"
                  disabled={isPublished}
                  style={
                    isPublished ? { opacity: 0.4, cursor: "not-allowed" } : {}
                  }
                />
              </span>
            </Tooltip>
            {canDelete && (
              <Tooltip
                title={
                  isPublished ? "Đã xuất bản - không thể xóa" : "Xóa hóa đơn"
                }
              >
                <span>
                  <Button
                    type="link"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(record)}
                    size="small"
                    disabled={isPublished}
                    style={
                      isPublished ? { opacity: 0.4, cursor: "not-allowed" } : {}
                    }
                  />
                </span>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      title="Quản lý hóa đơn tiện ích"
      extra={
        canManage && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo hóa đơn
          </Button>
        )
      }
    >
      {/* Search & Filter */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Input
            placeholder="Tìm kiếm phòng, tòa nhà..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <InputNumber
            placeholder="Tháng"
            min={1}
            max={12}
            value={filterMonth}
            onChange={(value) => {
              setFilterMonth(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <InputNumber
            placeholder="Năm"
            min={2000}
            value={filterYear}
            onChange={(value) => {
              setFilterYear(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Select
            placeholder="Trạng thái"
            value={filterStatus}
            onChange={(value) => {
              setFilterStatus(value);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            allowClear
            style={{ width: "100%" }}
          >
            <Option value="DRAFT">Bản nháp</Option>
            <Option value="PUBLISHED">Đã xuất bản</Option>
          </Select>
        </Col>
      </Row>

      <Table
        rowKey="id"
        dataSource={bills}
        columns={columns}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} của ${total} hóa đơn`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
        size="middle"
      />

      <Modal
        open={modalVisible}
        title={editing ? "Cập nhật hóa đơn" : "Tạo hóa đơn"}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="Lưu"
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="room_id" label="Phòng" rules={[{ required: true }]}>
            <Select>
              {rooms.map((r) => (
                <Option key={r.id} value={r.id}>
                  {r.roomNumber}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="month"
                label="Tháng"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={12} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
                <InputNumber min={2000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="electric_old"
                label="Điện cũ"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="electric_new"
                label="Điện mới"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="water_old"
                label="Nước cũ"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="water_new"
                label="Nước mới"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="electric_fee" label="Phí điện">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="water_fee" label="Phí nước">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Trạng thái">
            <Select>
              <Option value="DRAFT">Bản nháp</Option>
              <Option value="PUBLISHED">Đã xuất bản</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}

export default UtilityBillsPage;
