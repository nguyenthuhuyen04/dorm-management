import React, { useState, useEffect } from "react";
import {
  Typography,
  Row,
  Col,
  Card,
  Statistic,
  Spin,
  Alert,
  Space,
  Button,
  Tag,
  Progress,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  HomeOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ArrowRightOutlined,
  CustomerServiceOutlined,
  WarningOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../services";
import { APP_ROUTES } from "../utils/constants";

const { Title, Text } = Typography;

function AdminDashboard() {
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

  const roomsTotal = data.rooms?.total || 0;
  const roomsOccupied = data.rooms?.occupied || 0;
  const roomsAvailable = data.rooms?.available || 0;
  const roomsMaintenance = data.rooms?.maintenance || 0;
  const occupancyRate =
    roomsTotal > 0
      ? Number(((roomsOccupied / roomsTotal) * 100).toFixed(1))
      : 0;
  const maintenanceRate =
    roomsTotal > 0
      ? Number(((roomsMaintenance / roomsTotal) * 100).toFixed(1))
      : 0;
  const availableRate =
    roomsTotal > 0
      ? Number(((roomsAvailable / roomsTotal) * 100).toFixed(1))
      : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card
        style={{
          background:
            "linear-gradient(135deg, #1677ff 0%, #3b82f6 50%, #22c55e 100%)",
          border: "none",
          color: "#fff",
          borderRadius: 18,
        }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24} lg={16}>
            <Title level={2} style={{ color: "#fff", marginBottom: 8 }}>
              Chào mừng, {user?.fullName || user?.username || "Quản trị viên"}!
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 15 }}>
              Theo dõi số lượng người dùng, phòng, hợp đồng và các yêu cầu hỗ
              trợ trong một bảng điều khiển thống nhất.
            </Text>
            <div style={{ marginTop: 14 }}>
              <Space wrap>
                <Button
                  type="primary"
                  ghost
                  onClick={() => navigate(APP_ROUTES.ROOMS)}
                >
                  Quản lý phòng
                </Button>
                <Button
                  style={{ color: "#fff", borderColor: "#fff" }}
                  onClick={() => navigate(APP_ROUTES.ANNOUNCEMENTS)}
                >
                  Xem thông báo
                </Button>
              </Space>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.24)",
                backdropFilter: "blur(8px)",
              }}
            >
              <Space
                orientation="vertical"
                size="small"
                style={{ width: "100%" }}
              >
                <Text style={{ color: "#fff" }}>Tình trạng hôm nay</Text>
                <Tag color="success">Đang hoạt động tốt</Tag>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#fff",
                  }}
                >
                  <span>Phòng trống</span>
                  <strong>{roomsAvailable}</strong>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#fff",
                  }}
                >
                  <span>Yêu cầu chờ xử lý</span>
                  <strong>
                    {(data.supportRequests?.pending || 0) +
                      (data.roomChangeRequests?.pending || 0)}
                  </strong>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#e6f4ff" }}
            onClick={() => navigate(APP_ROUTES.USERS)}
          >
            <Statistic
              title="Tổng số người dùng"
              value={data.users?.total || 0}
              prefix={<UserOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#f6ffed" }}
            onClick={() => navigate(APP_ROUTES.BUILDINGS)}
          >
            <Statistic
              title="Tòa nhà"
              value={data.buildings?.total || 0}
              prefix={<HomeOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#fff7e6" }}
            onClick={() => navigate(APP_ROUTES.ROOMS)}
          >
            <Statistic
              title="Phòng (Đã thuê/Trống)"
              value={`${roomsOccupied}/${roomsAvailable}`}
              prefix={<AppstoreOutlined style={{ color: "#fa8c16" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#f9f0ff" }}
            onClick={() => navigate(APP_ROUTES.STUDENTS)}
          >
            <Statistic
              title="Sinh viên"
              value={data.students?.total || 0}
              prefix={<TeamOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#e6fffb" }}
            onClick={() => navigate(APP_ROUTES.CONTRACTS)}
          >
            <Statistic
              title="Hợp đồng"
              value={data.contracts?.total || 0}
              prefix={<FileTextOutlined style={{ color: "#13c2c2" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#fff0f6" }}
            onClick={() => navigate(APP_ROUTES.PAYMENTS)}
          >
            <Statistic
              title="Giao dịch thanh toán"
              value={data.payments?.total || 0}
              prefix={<CreditCardOutlined style={{ color: "#eb2f96" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title="Hoạt động gần đây"
            extra={
              <Button
                type="link"
                onClick={() => navigate(APP_ROUTES.SUPPORT_REQUESTS)}
              >
                Xem tất cả
              </Button>
            }
            style={{ borderRadius: 14 }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                {
                  icon: (
                    <CustomerServiceOutlined style={{ color: "#1677ff" }} />
                  ),
                  bgColor: "#e6f4ff",
                  title: "Yêu cầu hỗ trợ",
                  detail: `${data.supportRequests?.pending || 0} yêu cầu đang chờ, ${data.supportRequests?.processing || 0} đang xử lý`,
                  value: `Còn ${data.supportRequests?.pending || 0} chờ`,
                },
                {
                  icon: <WarningOutlined style={{ color: "#fa8c16" }} />,
                  bgColor: "#fff7e6",
                  title: "Hợp đồng sắp hết hạn",
                  detail: `${data.contracts?.expired || 0} hợp đồng đã hết hạn, ${data.contracts?.active || 0} đang hoạt động`,
                  value: `${data.contracts?.active || 0} hiệu lực`,
                },
                {
                  icon: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
                  bgColor: "#f6ffed",
                  title: "Thanh toán",
                  detail: `${data.payments?.paid || 0} đã thanh toán, ${data.payments?.pending || 0} đang chờ, ${data.payments?.overdue || 0} quá hạn`,
                  value: `${data.payments?.paid || 0} thành công`,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: idx < 2 ? "1px solid #f0f0f0" : "none",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: item.bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>
                      {item.title}
                    </div>
                    <div style={{ color: "#666", fontSize: 13 }}>
                      {item.detail}
                    </div>
                  </div>
                  <Text
                    type="secondary"
                    style={{ fontSize: 12, flexShrink: 0, marginLeft: 8 }}
                  >
                    {item.value}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="Tỷ lệ sử dụng phòng"
            extra={<ArrowRightOutlined />}
            style={{ borderRadius: 14 }}
          >
            <Space
              orientation="vertical"
              style={{ width: "100%" }}
              size="middle"
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text>Phòng đã thuê</Text>
                  <Text strong>{occupancyRate}%</Text>
                </div>
                <Progress percent={occupancyRate} strokeColor="#1677ff" />
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text>Phòng trống</Text>
                  <Text strong>{availableRate}%</Text>
                </div>
                <Progress percent={availableRate} strokeColor="#52c41a" />
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <Text>Phòng bảo trì</Text>
                  <Text strong>{maintenanceRate}%</Text>
                </div>
                <Progress percent={maintenanceRate} strokeColor="#fa8c16" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default AdminDashboard;
