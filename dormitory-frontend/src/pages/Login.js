import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, Alert } from "antd";
import { UserOutlined, LockOutlined, HomeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authService";
import { showSuccess, handleApiError } from "../utils/toast";
import { DASHBOARD_BY_ROLE } from "../utils/constants";

const { Title, Text } = Typography;

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setLoading(true);
    setError(null);
    try {
      const response = await login({
        identifier: values.identifier,
        password: values.password,
      });
      const data = response.data;

      if (!data?.accessToken || !data?.user) {
        throw new Error("Phản hồi đăng nhập không hợp lệ");
      }

      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("authUser", JSON.stringify(data.user));

      showSuccess("Đăng nhập thành công!");

      // Redirect based on role
      const targetPath = DASHBOARD_BY_ROLE[data.user?.role] || "/login";
      navigate(targetPath);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Sai tên đăng nhập hoặc mật khẩu";
      setError(msg);
      handleApiError(err, "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        padding: 24,
      }}
    >
      <Card
        style={{
          width: 420,
          maxWidth: "100%",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #1677ff, #22c55e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <HomeOutlined style={{ fontSize: 32, color: "#fff" }} />
          </div>
          <Title level={3} style={{ margin: 0 }}>
            Ký túc xá
          </Title>
          <Text type="secondary">Đăng nhập vào hệ thống quản lý</Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16, borderRadius: 8 }}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="identifier"
            rules={[
              {
                required: true,
                message: "Vui lòng nhập email hoặc tên đăng nhập",
              },
            ]}
          >
            <Input
              id="identifier"
              prefix={<UserOutlined />}
              placeholder="Nhập email hoặc tên đăng nhập"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu" }]}
          >
            <Input.Password
              id="password"
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
              disabled={loading}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, borderRadius: 8, fontWeight: 600 }}
            >
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default LoginPage;
