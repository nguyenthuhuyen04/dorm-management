import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Descriptions,
} from "antd";
import { EyeOutlined, FileTextOutlined, HomeOutlined } from "@ant-design/icons";
import * as contractService from "../../services/contractService";
import ContractDetailModal from "../../components/contracts/ContractDetailModal";
import { handleApiError } from "../../utils/toast";

const { Title, Text } = Typography;

const STATUS_MAP = {
  ACTIVE: { color: "green", label: "Hoạt động" },
  EXPIRED: { color: "default", label: "Đã kết thúc" },
  CANCELLED: { color: "red", label: "Đã hủy" },
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

function MyContractPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailContract, setDetailContract] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchContracts = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      const res = await contractService.getAll(params);
      const responseData = res.data;
      if (responseData) {
        setContracts(responseData.data || []);
        setPagination({
          current: responseData.page || page,
          pageSize: responseData.limit || pageSize,
          total: responseData.total || 0,
        });
      }
    } catch (err) {
      handleApiError(err, "Có lỗi xảy ra khi tải hợp đồng");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContracts(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = useCallback(
    (pag) => {
      fetchContracts(pag.current, pag.pageSize);
    },
    [fetchContracts],
  );

  const handleViewDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await contractService.getById(record.id);
      setDetailContract(res.data || res);
    } catch (err) {
      handleApiError(err, "Không thể tải chi tiết hợp đồng");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // Tìm hợp đồng ACTIVE đầu tiên để hiển thị thông tin phòng
  const activeContract = useMemo(() => {
    return contracts.find((c) => c.status === "ACTIVE") || null;
  }, [contracts]);

  const columns = [
    {
      title: "STT",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Mã hợp đồng",
      dataIndex: "contractCode",
      key: "contractCode",
      ellipsis: true,
    },
    {
      title: "Phòng",
      key: "room",
      render: (_, record) => record.room?.roomNumber || "—",
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "Tòa nhà",
      key: "building",
      render: (_, record) => record.room?.building?.buildingName || "—",
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Ngày bắt đầu",
      dataIndex: "startDate",
      key: "startDate",
      render: (val) => formatDate(val),
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "endDate",
      key: "endDate",
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        <FileTextOutlined style={{ marginRight: 8 }} />
        Hợp đồng của tôi
      </Title>

      {/* Card thông tin phòng hiện tại */}
      {activeContract && activeContract.room && (
        <Card
          style={{
            background: "linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)",
            border: "1px solid #91d5ff",
          }}
        >
          <Row gutter={[16, 16]} align="middle">
            <Col>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "#1677ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <HomeOutlined style={{ fontSize: 24, color: "#fff" }} />
              </div>
            </Col>
            <Col flex="auto">
              <Text strong style={{ fontSize: 16 }}>
                🏠 Phòng hiện tại của bạn
              </Text>
              <Descriptions
                size="small"
                column={{ xs: 1, sm: 2, md: 4 }}
                style={{ marginTop: 8 }}
              >
                <Descriptions.Item label="Phòng">
                  <strong style={{ fontSize: 15 }}>
                    {activeContract.room.roomNumber}
                  </strong>
                </Descriptions.Item>
                <Descriptions.Item label="Tòa nhà">
                  {activeContract.room.building?.buildingName || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Mã hợp đồng">
                  {activeContract.contractCode || "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color="green">Đang hiệu lực</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Ngày bắt đầu">
                  {formatDate(activeContract.startDate)}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày kết thúc">
                  {formatDate(activeContract.endDate)}
                </Descriptions.Item>
              </Descriptions>
            </Col>
          </Row>
        </Card>
      )}

      <Card title="Lịch sử hợp đồng">
        <Table
          dataSource={contracts}
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
              `${range[0]}-${range[1]} của ${total} hợp đồng`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      <ContractDetailModal
        visible={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailContract(null);
        }}
        contract={detailContract}
        loading={detailLoading}
      />
    </div>
  );
}

export default MyContractPage;
