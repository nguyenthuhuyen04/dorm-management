import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Row,
  Col,
  Tooltip,
  message,
  Statistic,
  Alert,
  Typography,
} from "antd";
import dayjs from "dayjs";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import {
  paymentService,
  studentService,
  contractService,
  utilityBillService,
  dashboardService,
} from "../../services";

const { Text } = Typography;
const { Option } = Select;

const STATUS_MAP = {
  UNPAID: { color: "orange", label: "Chưa thanh toán" },
  PENDING: { color: "blue", label: "Đang xử lý" },
  PAID: { color: "green", label: "Đã thanh toán" },
};

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getErrorMessage(err, fallback) {
  const backendMessage =
    err?.response?.data?.message || err?.response?.data?.error || err?.message;

  if (Array.isArray(backendMessage)) {
    return backendMessage[0] || fallback;
  }

  if (typeof backendMessage === "string" && backendMessage.trim()) {
    return backendMessage;
  }

  return fallback;
}

function PaymentsPage() {
  // Detect role from localStorage (same pattern as Sidebar.js / ProtectedRoute)
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const userRole = authUser?.role;
  const isManager = userRole === "MANAGER";
  const isAdmin = userRole === "ADMIN";

  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [selectedContractRoomId, setSelectedContractRoomId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  // Dashboard statistics
  const [dashboardStats, setDashboardStats] = useState(null);

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

  // Fetch dashboard statistics for reliable totals
  const loadDashboardStats = useCallback(async () => {
    try {
      const res = await dashboardService.getDashboard();
      const stats = res?.data?.payments;
      if (stats) {
        setDashboardStats(stats);
      }
    } catch {
      // Non-critical - silently fail, stats will just be hidden
      setDashboardStats(null);
    }
  }, []);

  const loadData = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const params = { page, limit: pageSize };
        if (searchText) params.search = searchText;
        if (filterMonth) params.month = filterMonth;
        if (filterYear) params.year = filterYear;
        if (filterStatus) params.status = filterStatus;

        const [paymentRes, studentRes, contractRes, billRes] =
          await Promise.all([
            paymentService.getAll(params),
            studentService.getAll({ page: 1, limit: 1000 }),
            contractService.getAll({ page: 1, limit: 1000 }),
            utilityBillService.getAll({ page: 1, limit: 1000 }),
          ]);

        const responseData = paymentRes?.data;
        setPayments(responseData?.data || []);
        setPagination({
          current: responseData?.page || page,
          pageSize: responseData?.limit || pageSize,
          total: responseData?.total || 0,
        });
        setStudents(
          Array.isArray(studentRes?.data)
            ? studentRes.data
            : studentRes?.data?.data || [],
        );
        setContracts(
          Array.isArray(contractRes?.data)
            ? contractRes.data
            : contractRes?.data?.data || [],
        );
        setBills(
          Array.isArray(billRes?.data)
            ? billRes.data
            : billRes?.data?.data || [],
        );
      } catch (err) {
        message.error("Không thể tải dữ liệu thanh toán");
        setPayments([]);
      } finally {
        setLoading(false);
      }
    },
    [searchText, filterMonth, filterYear, filterStatus],
  );

  const syncUtilityBillsForContract = useCallback(
    (contractId) => {
      if (!contractId) {
        setSelectedContractRoomId(null);
        setFilteredBills([]);
        form.setFieldsValue({ utility_bill_id: undefined });
        return;
      }

      const selectedContract = contracts.find(
        (contract) => Number(contract.id) === Number(contractId),
      );
      const roomId =
        selectedContract?.roomId ?? selectedContract?.room?.id ?? null;

      setSelectedContractRoomId(roomId);

      if (!roomId) {
        setFilteredBills([]);
        form.setFieldsValue({ utility_bill_id: undefined });
        return;
      }

      const nextFilteredBills = bills.filter(
        (bill) => Number(bill.roomId) === Number(roomId),
      );
      setFilteredBills(nextFilteredBills);

      const currentUtilityBillId = form.getFieldValue("utility_bill_id");
      if (
        currentUtilityBillId &&
        !nextFilteredBills.some(
          (bill) => Number(bill.id) === Number(currentUtilityBillId),
        )
      ) {
        form.setFieldsValue({ utility_bill_id: undefined });
      }
    },
    [bills, contracts, form],
  );

  useEffect(() => {
    loadData(1, pagination.pageSize);
    if (isAdmin || isManager) {
      loadDashboardStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncUtilityBillsForContract(form.getFieldValue("contract_id"));
  }, [bills, contracts, form, syncUtilityBillsForContract]);

  // Auto-reload when filters change
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

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setSelectedContractRoomId(null);
    setFilteredBills([]);
    setModalVisible(true);
  };

  const openEdit = (record) => {
    if (record.status === "PAID") {
      message.warning("Hóa đơn đã được thanh toán, không thể chỉnh sửa.");
      return;
    }

    setEditing(record);
    form.setFieldsValue({
      invoice_code: record.invoiceCode,
      student_id: record.studentId,
      contract_id: record.contractId,
      utility_bill_id: record.utilityBillId,
      month: record.month,
      year: record.year,
      room_fee: record.roomFee,
      electric_fee: record.electricFee,
      water_fee: record.waterFee,
      other_fee: record.otherFee,
      total_amount: record.totalAmount,
      due_date: record.dueDate ? dayjs(record.dueDate) : null,
      payment_date: record.paymentDate ? dayjs(record.paymentDate) : null,
      payment_method: record.paymentMethod,
      status: record.status,
    });
    syncUtilityBillsForContract(record.contractId);
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const selectedContract = contracts.find(
        (contract) => Number(contract.id) === Number(values.contract_id),
      );
      const selectedRoomId =
        selectedContract?.roomId ?? selectedContract?.room?.id ?? null;

      if (!selectedRoomId) {
        message.error("Vui lòng chọn hợp đồng có phòng hợp lệ.");
        return;
      }

      const hasMatchingBill = filteredBills.some(
        (bill) => Number(bill.id) === Number(values.utility_bill_id),
      );

      if (!hasMatchingBill) {
        message.error(
          "Không có hóa đơn tiện ích phù hợp cho phòng của hợp đồng này.",
        );
        return;
      }

      const payload = {
        invoice_code: values.invoice_code,
        student_id: values.student_id,
        contract_id: values.contract_id,
        utility_bill_id: values.utility_bill_id,
        month: values.month,
        year: values.year,
        room_fee: values.room_fee,
        electric_fee: values.electric_fee,
        water_fee: values.water_fee,
        other_fee: values.other_fee,
        total_amount: values.total_amount,
        due_date: values.due_date?.toISOString?.() || values.due_date,
        payment_date:
          values.payment_date?.toISOString?.() || values.payment_date,
        payment_method: values.payment_method,
        status: values.status,
      };
      if (editing) await paymentService.update(editing.id, payload);
      else await paymentService.create(payload);
      message.success(
        editing
          ? "Cập nhật thanh toán thành công"
          : "Tạo thanh toán thành công",
      );
      setModalVisible(false);
      loadData(pagination.current, pagination.pageSize);
      // Refresh stats after mutation
      loadDashboardStats();
    } catch (err) {
      message.error(getErrorMessage(err, "Không thể lưu thanh toán"));
    }
  };

  const handleDelete = (record) => {
    const statusLabel = STATUS_MAP[record.status]?.label || record.status;
    Modal.confirm({
      title: "Xác nhận xóa hóa đơn",
      icon: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
      content: (
        <div style={{ marginTop: 12 }}>
          <p>
            <Text strong>Mã hóa đơn:</Text> {record.invoiceCode}
          </p>
          <p>
            <Text strong>Trạng thái:</Text>{" "}
            <Tag color={STATUS_MAP[record.status]?.color}>{statusLabel}</Tag>
          </p>
          <p>
            <Text strong>Tổng tiền:</Text>{" "}
            <Text strong style={{ color: "#cf1322" }}>
              {formatCurrency(record.totalAmount)}
            </Text>
          </p>
          <p style={{ color: "#ff4d4f", marginTop: 12 }}>
            Hành động này không thể hoàn tác.
          </p>
        </div>
      ),
      okText: "Xóa",
      okType: "danger",
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await paymentService.remove(record.id);
          message.success("Xóa thanh toán thành công");
          loadData(pagination.current, pagination.pageSize);
          loadDashboardStats();
        } catch (err) {
          message.error(getErrorMessage(err, "Không thể xóa thanh toán"));
        }
      },
    });
  };

  // Statistic cards config
  const statsCards = dashboardStats
    ? [
        {
          title: "Tổng hóa đơn",
          value: dashboardStats.total ?? 0,
          icon: (
            <CreditCardOutlined style={{ fontSize: 24, color: "#1890ff" }} />
          ),
          color: "#e6f7ff",
          suffix: "hóa đơn",
        },
        {
          title: "Đã thanh toán",
          value: dashboardStats.paid ?? 0,
          icon: (
            <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />
          ),
          color: "#f6ffed",
          suffix: "hóa đơn",
        },
        {
          title: "Đang xử lý",
          value: dashboardStats.pending ?? 0,
          icon: (
            <ClockCircleOutlined style={{ fontSize: 24, color: "#1890ff" }} />
          ),
          color: "#e6f7ff",
          suffix: "hóa đơn",
        },
        {
          title: "Quá hạn",
          value: dashboardStats.overdue ?? 0,
          icon: (
            <ExclamationCircleOutlined
              style={{ fontSize: 24, color: "#ff4d4f" }}
            />
          ),
          color: "#fff2f0",
          suffix: "hóa đơn",
        },
      ]
    : [];

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    {
      title: "Mã hóa đơn",
      dataIndex: "invoiceCode",
      key: "invoiceCode",
      ellipsis: true,
    },
    {
      title: "Sinh viên",
      key: "student",
      render: (_, r) => r.student?.user?.fullName || r.studentId,
      ellipsis: true,
    },
    {
      title: "Mã SV",
      key: "studentCode",
      render: (_, r) => r.student?.studentCode || "—",
      responsive: ["lg", "xl"],
    },
    {
      title: "Hợp đồng",
      key: "contract",
      render: (_, r) => r.contract?.contractCode || r.contractId,
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Tháng/Năm",
      key: "monthYear",
      render: (_, r) => `${r.month}/${r.year}`,
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "Tiền phòng",
      dataIndex: "roomFee",
      key: "roomFee",
      render: (val) => formatCurrency(val),
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (val) => <strong>{formatCurrency(val)}</strong>,
    },
    {
      title: "PT thanh toán",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (val) => val || "—",
      responsive: ["lg", "xl"],
    },
    {
      title: "Hạn thanh toán",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (val) => formatDate(val),
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Ngày thanh toán",
      dataIndex: "paymentDate",
      key: "paymentDate",
      render: (val) => formatDate(val),
      responsive: ["lg", "xl"],
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
        const isPaid = record.status === "PAID";

        return (
          <Space size="small">
            <Tooltip
              title={
                isPaid
                  ? "✓ Đã thanh toán - không thể chỉnh sửa"
                  : "Chỉnh sửa hóa đơn"
              }
            >
              <span>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                  size="small"
                  disabled={isPaid}
                  style={isPaid ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                />
              </span>
            </Tooltip>
            <Tooltip
              title={isPaid ? "✓ Đã thanh toán - không thể xóa" : "Xóa hóa đơn"}
            >
              <span>
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record)}
                  size="small"
                  disabled={isPaid}
                  style={isPaid ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                />
              </span>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Contextual header based on role */}
      <div>
        <Typography.Title level={4} style={{ margin: 0 }}>
          <DollarOutlined style={{ marginRight: 8 }} />
          {isManager
            ? "Quản lý thanh toán tòa nhà"
            : "Quản lý thanh toán hệ thống"}
        </Typography.Title>
        <Typography.Text type="secondary">
          {isManager
            ? "Quản lý các hóa đơn thanh toán trong phạm vi tòa nhà bạn phụ trách"
            : "Quản lý tất cả các hóa đơn thanh toán trong hệ thống"}
        </Typography.Text>
      </div>

      {/* Manager banner */}
      {isManager && (
        <Alert
          message="Phạm vi quản lý"
          description="Bạn đang xem các hóa đơn thuộc tòa nhà bạn quản lý. Dữ liệu được lọc theo quyền truy cập."
          type="info"
          showIcon
          style={{
            backgroundColor: "#e6f7ff",
            border: "1px solid #91d5ff",
            borderRadius: 8,
          }}
        />
      )}

      {/* Statistics Cards - using data from dashboard API only */}
      {dashboardStats && (
        <Row gutter={[16, 16]}>
          {statsCards.map((stat, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Card
                hoverable
                style={{
                  borderRadius: 8,
                  backgroundColor: stat.color,
                  border: "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <Statistic
                    title={stat.title}
                    value={stat.value}
                    suffix={stat.suffix}
                    valueStyle={{ fontSize: 28, fontWeight: 600 }}
                  />
                  {stat.icon}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo thanh toán
          </Button>
        }
      >
        {/* Search & Filter */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Tìm kiếm mã hóa đơn, sinh viên..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
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
              <Option value="UNPAID">Chưa thanh toán</Option>
              <Option value="PENDING">Đang xử lý</Option>
              <Option value="PAID">Đã thanh toán</Option>
            </Select>
          </Col>
        </Row>

        <Table
          rowKey="id"
          dataSource={payments}
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
          scroll={{ x: 1400 }}
          size="middle"
          // Highlight PAID rows (already paid)
          onRow={(record) => ({
            style:
              record.status === "PAID"
                ? { backgroundColor: "#f6ffed" }
                : undefined,
          })}
        />
      </Card>

      <Modal
        open={modalVisible}
        title={editing ? "Cập nhật thanh toán" : "Tạo thanh toán"}
        onCancel={() => setModalVisible(false)}
        onOk={handleSubmit}
        okText="Lưu"
        width={700}
        destroyOnClose
        okButtonProps={{ disabled: editing?.status === "PAID" }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="invoice_code"
            label="Mã hóa đơn"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                name="student_id"
                label="Sinh viên"
                rules={[{ required: true }]}
              >
                <Select>
                  {students.map((s) => (
                    <Option key={s.id} value={s.id}>
                      {s.studentCode || s.id}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="contract_id"
                label="Hợp đồng"
                rules={[{ required: true }]}
              >
                <Select
                  onChange={(value) => syncUtilityBillsForContract(value)}
                >
                  {contracts.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.contractCode || c.id}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="utility_bill_id"
                label="Hóa đơn tiện ích"
                rules={[{ required: true }]}
              >
                <Select
                  disabled={!selectedContractRoomId}
                  allowClear
                  placeholder={
                    selectedContractRoomId
                      ? "Chọn hóa đơn tiện ích"
                      : "Vui lòng chọn hợp đồng trước"
                  }
                  notFoundContent={
                    selectedContractRoomId
                      ? "Không có hóa đơn tiện ích cho phòng này."
                      : "Vui lòng chọn hợp đồng trước."
                  }
                >
                  {filteredBills.map((b) => (
                    <Option key={b.id} value={b.id}>
                      {`#${b.id} - Phòng ${b.room?.roomNumber || b.roomId} - ${b.month}/${b.year}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item
                name="month"
                label="Tháng"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} max={12} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="year" label="Năm" rules={[{ required: true }]}>
                <InputNumber min={2000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="payment_method" label="Phương thức">
                <Input />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="status" label="Trạng thái">
                <Select>
                  <Option value="UNPAID">Chưa thanh toán</Option>
                  <Option value="PENDING">Đang xử lý</Option>
                  <Option value="PAID">Đã thanh toán</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="room_fee"
                label="Phí phòng"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="electric_fee" label="Phí điện">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="water_fee" label="Phí nước">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="other_fee" label="Phí khác">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="total_amount"
                label="Tổng tiền"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="due_date" label="Ngày đến hạn">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="payment_date" label="Ngày thanh toán">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

export default PaymentsPage;
