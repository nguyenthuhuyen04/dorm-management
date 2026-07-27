import React, { useState, useEffect } from "react";
import {
  Card,
  Descriptions,
  Tag,
  Spin,
  Typography,
  Row,
  Col,
  Empty,
  message,
} from "antd";
import { UserOutlined, IdcardOutlined } from "@ant-design/icons";
import * as authService from "../services/authService";
import * as studentService from "../services/studentService";
import { ROLE_COLORS, ROLE_LABELS } from "../utils/constants";

const { Title } = Typography;

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function ProfilePage() {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const userRes = await authService.getProfile();
      const userData = userRes.data || userRes;
      const currentAuthUser =
        JSON.parse(localStorage.getItem("authUser") || "{}") || {};
      const mergedUser = { ...currentAuthUser, ...(userData || {}) };

      localStorage.setItem("authUser", JSON.stringify(mergedUser));
      setUser(mergedUser);

      // Only fetch student info if role is STUDENT
      if (mergedUser?.role === "STUDENT") {
        try {
          const studentRes = await studentService.getAll({ page: 1, limit: 1 });
          const studentData = studentRes.data;
          if (studentData?.data?.length > 0) {
            setStudent(studentData.data[0]);
          }
        } catch (studentErr) {
          console.log("No student record found");
        }
      }
    } catch (err) {
      message.error(
        err.response?.data?.message || "Có lỗi xảy ra khi tải thông tin",
      );
    } finally {
      setLoading(false);
    }
  };

  const genderLabel = (gender) => {
    if (!gender) return "—";
    if (gender === "Male") return "Nam";
    if (gender === "Female") return "Nữ";
    return gender;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <Title level={4} style={{ margin: 0 }}>
          <UserOutlined style={{ marginRight: 8 }} />
          Thông tin cá nhân
        </Title>
      </Card>

      <Spin spinning={loading}>
        {!user && !loading ? (
          <Card>
            <Empty description="Không có dữ liệu" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Thông tin tài khoản">
                <Descriptions column={{ xs: 1, sm: 2 }} size="small" bordered>
                  <Descriptions.Item label="Tên đăng nhập">
                    {user?.username || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Họ và tên">
                    {user?.fullName || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email">
                    {user?.email || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Số điện thoại">
                    {user?.phone || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Vai trò">
                    <Tag color={ROLE_COLORS[user?.role] || "#1890ff"}>
                      {ROLE_LABELS[user?.role] || user?.role || "—"}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            {user?.role === "STUDENT" && (
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <>
                      <IdcardOutlined style={{ marginRight: 8 }} />
                      Thông tin sinh viên
                    </>
                  }
                >
                  {!student ? (
                    <Empty description="Không có thông tin sinh viên" />
                  ) : (
                    <Descriptions
                      column={{ xs: 1, sm: 2 }}
                      size="small"
                      bordered
                    >
                      <Descriptions.Item label="Mã sinh viên">
                        {student.studentCode || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Giới tính">
                        {genderLabel(student.gender)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Ngày sinh">
                        {formatDate(student.birthday)}
                      </Descriptions.Item>
                      <Descriptions.Item label="Khoa">
                        {student.faculty || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Lớp">
                        {student.className || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="Địa chỉ">
                        {student.address || "—"}
                      </Descriptions.Item>
                      <Descriptions.Item label="SĐT phụ huynh">
                        {student.parentPhone || "—"}
                      </Descriptions.Item>
                    </Descriptions>
                  )}
                </Card>
              </Col>
            )}
          </Row>
        )}
      </Spin>
    </div>
  );
}

export default ProfilePage;
