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
import { EyeOutlined, BookOutlined } from "@ant-design/icons";
import * as regulationService from "../../services/regulationService";
import { handleApiError } from "../../utils/toast";

const { Title, Paragraph } = Typography;

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function truncateText(text, maxLength = 100) {
  if (!text) return "—";
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function RegulationsPage() {
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRegulation, setDetailRegulation] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRegulations = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      const res = await regulationService.getAll(params);
      const responseData = res.data;
      if (responseData) {
        setRegulations(responseData.data || []);
        setPagination({
          current: responseData.page || page,
          pageSize: responseData.limit || pageSize,
          total: responseData.total || 0,
        });
      }
    } catch (err) {
      handleApiError(err, "Có lỗi xảy ra khi tải nội quy");
      setRegulations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegulations(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = useCallback(
    (pag) => {
      fetchRegulations(pag.current, pag.pageSize);
    },
    [fetchRegulations],
  );

  const handleViewDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await regulationService.getById(record.id);
      setDetailRegulation(res.data || res);
    } catch (err) {
      handleApiError(err, "Không thể tải chi tiết nội quy");
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
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val) => formatDate(val),
      responsive: ["md", "lg", "xl"],
      width: 120,
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
        <BookOutlined style={{ marginRight: 8 }} />
        Nội quy
      </Title>

      <Card>
        <Table
          dataSource={regulations}
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
              `${range[0]}-${range[1]} của ${total} nội quy`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 600 }}
          size="middle"
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết nội quy"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailRegulation(null);
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Spin spinning={detailLoading}>
          {!detailRegulation ? (
            <Empty description="Không có dữ liệu nội quy" />
          ) : (
            <div>
              <Title level={4}>{detailRegulation.title}</Title>
              <Paragraph
                style={{
                  color: "#888",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                Ngày tạo: {formatDate(detailRegulation.createdAt)}
              </Paragraph>
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                  fontSize: 15,
                }}
              >
                {detailRegulation.content}
              </div>
            </div>
          )}
        </Spin>
      </Modal>
    </div>
  );
}

export default RegulationsPage;
