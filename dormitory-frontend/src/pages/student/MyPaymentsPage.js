import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Descriptions,
  Spin,
  Empty,
  Typography,
  Row,
  Col,
  Statistic,
  Select,
  Input,
} from "antd";
import {
  EyeOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import * as paymentService from "../../services/paymentService";
import { dashboardService } from "../../services";
import { handleApiError } from "../../utils/toast";

const { Title } = Typography;
const { Option } = Select;

const STATUS_MAP = {
  UNPAID: { color: "orange", label: "Chưa thanh toán" },
  PENDING: { color: "blue", label: "Đang xử lý" },
  PAID: { color: "green", label: "Đã thanh toán" },
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

function MyPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Dashboard statistics (from /dashboard/student)
  const [paymentStats, setPaymentStats] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState(undefined);
  const [searchText, setSearchText] = useState("");

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailPayment, setDetailPayment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Fetch student dashboard for reliable payment stats
  const loadPaymentStats = useCallback(async () => {
    try {
      const res = await dashboardService.getStudentDashboard();
      const data = res?.data?.payments;
      if (data) {
        setPaymentStats(data);
      }
    } catch {
      // Stats are non-critical
      setPaymentStats(null);
    }
  }, []);

  const fetchPayments = useCallback(
    async (page = 1, pageSize = 10) => {
      setLoading(true);
      try {
        const params = { page, limit: pageSize };
        if (filterStatus) params.status = filterStatus;
        if (searchText) params.search = searchText;
        const res = await paymentService.getAll(params);
        const responseData = res.data;
        if (responseData) {
          setPayments(responseData.data || []);
          setPagination({
            current: responseData.page || page,
            pageSize: responseData.limit || pageSize,
            total: responseData.total || 0,
          });
        }
      } catch (err) {
        handleApiError(err, "Có lỗi xảy ra khi tải thanh toán");
        setPayments([]);
      } finally {
        setLoading(false);
      }
    },
    [filterStatus, searchText],
  );

  useEffect(() => {
    fetchPayments(1, pagination.pageSize);
    loadPaymentStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when filters change
  useEffect(() => {
    fetchPayments(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, searchText]);

  const handleTableChange = useCallback(
    (pag) => {
      fetchPayments(pag.current, pag.pageSize);
    },
    [fetchPayments],
  );

  const handleViewDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await paymentService.getById(record.id);
      setDetailPayment(res.data || res);
    } catch (err) {
      handleApiError(err, "Không thể tải chi tiết thanh toán");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns = [
    {
      title: "STT",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Mã hóa đơn",
      dataIndex: "invoiceCode",
      key: "invoiceCode",
      ellipsis: true,
    },
    {
      title: "Tháng/Năm",
      key: "monthYear",
      render: (_, record) =>
        record.month && record.year ? `${record.month}/${record.year}` : "—",
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
      title: "Phí khác",
      dataIndex: "otherFee",
      key: "otherFee",
      render: (val) => formatCurrency(val),
      responsive: ["xl"],
    },
    {
      title: "Tổng tiền",
      dataIndex: "totalAmount",
      key: "totalAmount",
      render: (val) => <strong>{formatCurrency(val)}</strong>,
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
      render: (status) => (
        <Tag color={STATUS_MAP[status]?.color || "default"}>
          {STATUS_MAP[status]?.label || status}
        </Tag>
      ),
    },
    {
      title: "Phương thức",
      dataIndex: "paymentMethod",
      key: "paymentMethod",
      render: (val) => val || "—",
      responsive: ["lg", "xl"],
    },
    {
      title: "Hành động",
      key: "actions",
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
            size="small"
          >
            Xem
          </Button>
        </Space>
      ),
    },
  ];

  // Stats cards configuration - from dashboard API only
  const statsCards = paymentStats
    ? [
        {
          title: "Tổng số hóa đơn",
          value: paymentStats.paidCount + paymentStats.unpaidCount,
          icon: (
            <CreditCardOutlined style={{ fontSize: 24, color: "#1890ff" }} />
          ),
          color: "#e6f7ff",
          suffix: "hóa đơn",
        },
        {
          title: "Đã thanh toán",
          value: formatCurrency(paymentStats.paidAmount),
          icon: (
            <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />
          ),
          color: "#f6ffed",
          suffix: "",
          isCurrency: true,
        },
        {
          title: "Chưa thanh toán",
          value: formatCurrency(paymentStats.unpaidAmount),
          icon: (
            <ClockCircleOutlined style={{ fontSize: 24, color: "#fa8c16" }} />
          ),
          color: "#fff7e6",
          suffix: "",
          isCurrency: true,
        },
        {
          title: "Quá hạn",
          value: paymentStats.overdueCount ?? 0,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Title level={3} style={{ marginBottom: 0 }}>
        <CreditCardOutlined style={{ marginRight: 8 }} />
        Thanh toán của tôi
      </Title>

      {/* Summary Cards */}
      {paymentStats && (
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
                    valueStyle={{
                      fontSize: stat.isCurrency ? 20 : 28,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  />
                  {stat.icon}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Card>
        {/* Filters */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Tìm kiếm mã hóa đơn..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Lọc trạng thái"
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
          dataSource={payments}
          columns={columns}
          rowKey="id"
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
          scroll={{ x: 1000 }}
          size="middle"
          onRow={(record) => ({
            style:
              record.status === "PAID"
                ? { backgroundColor: "#f6ffed" }
                : undefined,
          })}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết thanh toán"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailPayment(null);
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Spin spinning={detailLoading}>
          {!detailPayment ? (
            <Empty description="Không có dữ liệu thanh toán" />
          ) : (
            <>
              <Descriptions
                title="Thông tin hóa đơn"
                bordered
                column={{ xs: 1, sm: 2 }}
                size="small"
                style={{ marginBottom: 24 }}
              >
                <Descriptions.Item label="Mã hóa đơn">
                  <strong>{detailPayment.invoiceCode}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={STATUS_MAP[detailPayment.status]?.color || "default"}
                  >
                    {STATUS_MAP[detailPayment.status]?.label ||
                      detailPayment.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tháng/Năm">
                  {detailPayment.month && detailPayment.year
                    ? `${detailPayment.month}/${detailPayment.year}`
                    : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Hạn thanh toán">
                  {formatDate(detailPayment.dueDate)}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày thanh toán">
                  {formatDate(detailPayment.paymentDate)}
                </Descriptions.Item>
                <Descriptions.Item label="Phương thức thanh toán">
                  {detailPayment.paymentMethod || "—"}
                </Descriptions.Item>
              </Descriptions>

              <Descriptions
                title="Chi tiết khoản phí"
                bordered
                column={{ xs: 1, sm: 2 }}
                size="small"
              >
                <Descriptions.Item label="Tiền phòng">
                  {formatCurrency(detailPayment.roomFee)}
                </Descriptions.Item>
                <Descriptions.Item label="Tiền điện">
                  {formatCurrency(detailPayment.electricFee)}
                </Descriptions.Item>
                <Descriptions.Item label="Tiền nước">
                  {formatCurrency(detailPayment.waterFee)}
                </Descriptions.Item>
                <Descriptions.Item label="Phí khác">
                  {formatCurrency(detailPayment.otherFee)}
                </Descriptions.Item>
                <Descriptions.Item label="Tổng tiền">
                  <strong>{formatCurrency(detailPayment.totalAmount)}</strong>
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </Spin>
      </Modal>
    </div>
  );
}

export default MyPaymentsPage;
