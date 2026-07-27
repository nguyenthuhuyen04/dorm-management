import React, { useState, useEffect } from "react";
import { Typography, Row, Col, Card, Statistic, Spin, Alert } from "antd";
import {
  FileTextOutlined,
  CreditCardOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { dashboardService } from "../services";
import { APP_ROUTES } from "../utils/constants";

const { Title, Text } = Typography;

function StudentDashboard() {
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
        const response = await dashboardService.getStudentDashboard();
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card
        style={{
          background: "linear-gradient(135deg, #1677ff 0%, #22c55e 100%)",
          border: "none",
          color: "#fff",
          borderRadius: 18,
        }}
      >
        <Row gutter={24} align="middle">
          <Col xs={24}>
            <Title level={2} style={{ color: "#fff", marginBottom: 8 }}>
              Chào mừng, {user?.fullName || user?.username || "Sinh viên"}!
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 15 }}>
              Theo dõi hợp đồng, thanh toán và yêu cầu hỗ trợ của bạn.
            </Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#e6f4ff" }}
            onClick={() => navigate(APP_ROUTES.STUDENT_CONTRACT)}
          >
            <Statistic
              title="Hợp đồng"
              value={data.contract ? "Đang hoạt động" : "Chưa có"}
              prefix={<FileTextOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#f6ffed" }}
            onClick={() => navigate(APP_ROUTES.STUDENT_PAYMENTS)}
          >
            <Statistic
              title="Đã thanh toán"
              value={data.payments?.paidCount || 0}
              suffix={`/ ${data.payments?.totalCount || 0}`}
              prefix={<CreditCardOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#fff7e6" }}
            onClick={() => navigate(APP_ROUTES.STUDENT_PAYMENTS)}
          >
            <Statistic
              title="Còn nợ"
              value={data.payments?.unpaidAmount || 0}
              prefix={<CreditCardOutlined style={{ color: "#fa8c16" }} />}
              suffix="đ"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ borderRadius: 14, background: "#f9f0ff" }}
            onClick={() => navigate(APP_ROUTES.STUDENT_SUPPORT_REQUESTS)}
          >
            <Statistic
              title="Yêu cầu hỗ trợ"
              value={data.supportRequests?.total || 0}
              prefix={<CustomerServiceOutlined style={{ color: "#722ed1" }} />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default StudentDashboard;
