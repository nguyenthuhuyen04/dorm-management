import React, { useState, useEffect } from "react";
import { Typography, Row, Col, Card, Statistic, Spin, Alert } from "antd";
import {
  HomeOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ThunderboltOutlined,
  CustomerServiceOutlined,
  TeamOutlined,
  DollarOutlined,
  RiseOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../services";
import { APP_ROUTES } from "../utils/constants";

const { Title } = Typography;

function ManagerDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("authUser") || "{}");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await dashboardService.getDashboard();
        setData(response.data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Không thể tải dữ liệu dashboard",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 50 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: "#666" }}>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Lỗi" description={error} type="error" showIcon />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <Title level={3}>
        Chào mừng, {user?.fullName || user?.username || "Quản lý"}!
      </Title>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Bảng điều khiển quản lý khu ký túc xá
      </p>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_BUILDINGS)}>
            <Statistic
              title="Tòa nhà quản lý"
              value={data.buildings?.total || 0}
              prefix={<HomeOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_ROOMS)}>
            <Statistic
              title="Phòng"
              value={data.rooms?.total || 0}
              prefix={<AppstoreOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_CONTRACTS)}>
            <Statistic
              title="Hợp đồng"
              value={data.contracts?.total || 0}
              prefix={<FileTextOutlined style={{ color: "#fa8c16" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_CONTRACTS)}>
            <Statistic
              title="Sinh viên"
              value={data.students?.total || 0}
              prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_PAYMENTS)}>
            <Statistic
              title="Thanh toán chờ xử lý"
              value={data.payments?.pending || 0}
              prefix={<CreditCardOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_UTILITY_BILLS)}>
            <Statistic
              title="Hóa đơn tiện ích"
              value={data.utilityBills?.total || 0}
              prefix={<ThunderboltOutlined style={{ color: "#13c2c2" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_SUPPORT_REQUESTS)}>
            <Statistic
              title="Yêu cầu hỗ trợ"
              value={data.supportRequests?.total || 0}
              prefix={<CustomerServiceOutlined style={{ color: "#eb2f96" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_ROOMS)}>
            <Statistic
              title="Tỉ lệ lấp đầy"
              value={data.rooms?.occupancyRate || 0}
              suffix="%"
              precision={2}
              prefix={<RiseOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_PAYMENTS)}>
            <Statistic
              title="Doanh thu"
              value={data.revenue?.total || 0}
              prefix={<DollarOutlined style={{ color: "#52c41a" }} />}
              suffix="VNĐ"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_ROOMS)}>
            <Statistic
              title="Phòng trống"
              value={data.rooms?.available || 0}
              prefix={<HomeOutlined style={{ color: "#fa8c16" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_ROOM_CHANGE_REQUESTS)}>
            <Statistic
              title="Yêu cầu đổi phòng chờ"
              value={data.roomChangeRequests?.pending || 0}
              prefix={<SwapOutlined style={{ color: "#eb2f96" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card hoverable onClick={() => navigate(APP_ROUTES.MANAGER_PAYMENTS)}>
            <Statistic
              title="Thanh toán quá hạn"
              value={data.payments?.overdue || 0}
              prefix={<CreditCardOutlined style={{ color: "#ff4d4f" }} />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ManagerDashboard;
