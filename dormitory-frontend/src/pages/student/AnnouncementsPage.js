import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Modal,
  Typography,
  Space,
  Empty,
  Spin,
} from "antd";
import { EyeOutlined, NotificationOutlined } from "@ant-design/icons";
import * as announcementService from "../../services/announcementService";
import { handleApiError } from "../../utils/toast";

const { Title, Paragraph } = Typography;

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateText(text, maxLength = 100) {
  if (!text) return "—";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailAnnouncement, setDetailAnnouncement] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchAnnouncements = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      const res = await announcementService.getAll(params);
      const responseData = res.data;
      if (responseData) {
        setAnnouncements(responseData.data || []);
        setPagination({
          current: responseData.page || page,
          pageSize: responseData.limit || pageSize,
          total: responseData.total || 0,
        });
      }
    } catch (err) {
      handleApiError(err, "Có lỗi xảy ra khi tải thông báo");
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = useCallback(
    (pag) => {
      fetchAnnouncements(pag.current, pag.pageSize);
    },
    [fetchAnnouncements],
  );

  const handleViewDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await announcementService.getById(record.id);
      setDetailAnnouncement(res.data || res);
    } catch (err) {
      handleApiError(err, "Không thể tải chi tiết thông báo");
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
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "Nội dung",
      dataIndex: "content",
      key: "content",
      ellipsis: true,
      render: (val) => truncateText(val, 100),
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "Ngày đăng",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val) => formatDate(val),
      responsive: ["md", "lg", "xl"],
      width: 160,
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
        <NotificationOutlined style={{ marginRight: 8 }} />
        Thông báo
      </Title>

      <Card>
        <Table
          dataSource={announcements}
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
              `${range[0]}-${range[1]} của ${total} thông báo`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 600 }}
          size="middle"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết thông báo"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailAnnouncement(null);
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Spin spinning={detailLoading}>
          {!detailAnnouncement ? (
            <Empty description="Không có dữ liệu thông báo" />
          ) : (
            <div>
              <Title level={4}>{detailAnnouncement.title}</Title>
              <Paragraph
                style={{
                  color: "#888",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Đăng ngày: {formatDate(detailAnnouncement.createdAt)}
              </Paragraph>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                  fontSize: 15,
                }}
              >
                {detailAnnouncement.content}
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
}

export default AnnouncementsPage;
