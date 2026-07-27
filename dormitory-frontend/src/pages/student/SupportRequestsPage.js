import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Empty,
  Spin,
  Descriptions,
  Alert,
} from "antd";
import {
  EyeOutlined,
  PlusOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import * as supportRequestService from "../../services/supportRequestService";
import * as contractService from "../../services/contractService";
import { showSuccess, handleApiError } from "../../utils/toast";

const { Title } = Typography;
const { TextArea } = Input;

const STATUS_MAP = {
  PENDING: { color: "orange", label: "Chờ xử lý" },
  PROCESSING: { color: "blue", label: "Đang xử lý" },
  DONE: { color: "green", label: "Đã xử lý" },
};

const CATEGORY_OPTIONS = [
  { value: "ELECTRIC", label: "Điện" },
  { value: "WATER", label: "Nước" },
  { value: "INTERNET", label: "Internet" },
  { value: "FACILITY", label: "Cơ sở vật chất" },
  { value: "NOISE", label: "Tiếng ồn" },
  { value: "OTHER", label: "Khác" },
];

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

function SupportRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // Create modal
  const [createVisible, setCreateVisible] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [activeContractChecked, setActiveContractChecked] = useState(false);
  const [activeContract, setActiveContract] = useState(null);

  // Detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRequests = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      const res = await supportRequestService.getAll(params);
      const responseData = res.data;
      if (responseData) {
        setRequests(responseData.data || []);
        setPagination({
          current: responseData.page || page,
          pageSize: responseData.limit || pageSize,
          total: responseData.total || 0,
        });
      }
    } catch (err) {
      handleApiError(err, "Có lỗi xảy ra khi tải yêu cầu hỗ trợ");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkActiveContract = useCallback(async () => {
    try {
      const res = await contractService.getAll({ page: 1, limit: 100 });
      const data = res.data;
      if (data?.data) {
        const active = data.data.find((c) => c.status === "ACTIVE");
        setHasActiveContract(!!active);
        setActiveContract(active || null);
      } else {
        setHasActiveContract(false);
        setActiveContract(null);
      }
    } catch (err) {
      setHasActiveContract(false);
      setActiveContract(null);
    } finally {
      setActiveContractChecked(true);
    }
  }, []);

  useEffect(() => {
    fetchRequests(1, pagination.pageSize);
    checkActiveContract();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = useCallback(
    (pag) => {
      fetchRequests(pag.current, pag.pageSize);
    },
    [fetchRequests],
  );

  const handleViewDetail = async (record) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const res = await supportRequestService.getById(record.id);
      setDetailRequest(res.data || res);
    } catch (err) {
      handleApiError(err, "Không thể tải chi tiết yêu cầu");
      setDetailVisible(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreate = async (values) => {
    if (!activeContract) {
      handleApiError(null, "Bạn chưa có hợp đồng đang hiệu lực.");
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        ...values,
        roomId: activeContract.roomId || activeContract.room?.id,
        studentId: activeContract.studentId || activeContract.student?.id,
      };
      await supportRequestService.create(payload);
      showSuccess("Tạo yêu cầu hỗ trợ thành công!");
      setCreateVisible(false);
      form.resetFields();
      fetchRequests(1, pagination.pageSize);
    } catch (err) {
      handleApiError(err, "Có lỗi xảy ra khi tạo yêu cầu");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenCreate = () => {
    if (!hasActiveContract) {
      handleApiError(null, "Bạn chưa có hợp đồng đang hiệu lực.");
      return;
    }
    setCreateVisible(true);
  };

  const columns = [
    {
      title: "STT",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    {
      title: "Danh mục",
      dataIndex: "category",
      key: "category",
      render: (val) => {
        const cat = CATEGORY_OPTIONS.find((c) => c.value === val);
        return cat?.label || val || "—";
      },
      responsive: ["sm", "md", "lg", "xl"],
    },
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
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
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (val) => formatDate(val),
      responsive: ["md", "lg", "xl"],
      width: 160,
    },
    {
      title: "Người xử lý",
      key: "handler",
      render: (_, record) =>
        record.handler?.fullName || record.handler?.username || "—",
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        <CustomerServiceOutlined style={{ marginRight: 8 }} />
        Yêu cầu hỗ trợ
      </Title>

      <Card>
        {!activeContractChecked ? (
          <Spin description="Đang kiểm tra hợp đồng..." />
        ) : !hasActiveContract ? (
          <Alert
            message="Bạn chưa có hợp đồng đang hiệu lực."
            description="Bạn cần có hợp đồng hoạt động để có thể gửi yêu cầu hỗ trợ."
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <div style={{ marginBottom: 16, textAlign: "right" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            disabled={!hasActiveContract}
          >
            Tạo yêu cầu
          </Button>
        </div>

        <Table
          dataSource={requests}
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
              `${range[0]}-${range[1]} của ${total} yêu cầu`,
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          size="middle"
        />
      </Card>

      {/* Create Modal */}
      <Modal
        title="Tạo yêu cầu hỗ trợ"
        open={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          autoComplete="off"
        >
          <Form.Item
            name="category"
            label="Danh mục"
            rules={[{ required: true, message: "Vui lòng chọn danh mục" }]}
          >
            <Select placeholder="Chọn danh mục" options={CATEGORY_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[
              { required: true, message: "Vui lòng nhập tiêu đề" },
              { max: 255, message: "Tiêu đề không quá 255 ký tự" },
            ]}
          >
            <Input placeholder="Nhập tiêu đề" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Mô tả"
            rules={[{ required: true, message: "Vui lòng nhập mô tả" }]}
          >
            <TextArea rows={4} placeholder="Mô tả chi tiết vấn đề của bạn" />
          </Form.Item>

          <Form.Item style={{ textAlign: "right", marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => {
                  setCreateVisible(false);
                  form.resetFields();
                }}
              >
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={submitLoading}>
                Gửi yêu cầu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title="Chi tiết yêu cầu hỗ trợ"
        open={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailRequest(null);
        }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Spin spinning={detailLoading}>
          {!detailRequest ? (
            <Empty description="Không có dữ liệu yêu cầu" />
          ) : (
            <>
              <Descriptions
                title="Thông tin yêu cầu"
                bordered
                column={{ xs: 1, sm: 2 }}
                size="small"
                style={{ marginBottom: 24 }}
              >
                <Descriptions.Item label="Danh mục">
                  {(() => {
                    const cat = CATEGORY_OPTIONS.find(
                      (c) => c.value === detailRequest.category,
                    );
                    return cat?.label || detailRequest.category || "—";
                  })()}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag
                    color={STATUS_MAP[detailRequest.status]?.color || "default"}
                  >
                    {STATUS_MAP[detailRequest.status]?.label ||
                      detailRequest.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tiêu đề">
                  {detailRequest.title}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {formatDate(detailRequest.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Người xử lý">
                  {detailRequest.handler?.fullName ||
                    detailRequest.handler?.username ||
                    "Chưa phân công"}
                </Descriptions.Item>
              </Descriptions>

              <Descriptions
                title="Mô tả"
                bordered
                column={1}
                size="small"
                style={{ marginBottom: 24 }}
              >
                <Descriptions.Item label="Nội dung">
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {detailRequest.description || "—"}
                  </div>
                </Descriptions.Item>
              </Descriptions>

              {detailRequest.reply && (
                <Descriptions title="Phản hồi" bordered column={1} size="small">
                  <Descriptions.Item label="Phản hồi từ quản lý">
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {detailRequest.reply}
                    </div>
                  </Descriptions.Item>
                </Descriptions>
              )}
            </>
          )}
        </Spin>
      </Modal>
    </div>
  );
}

export default SupportRequestsPage;
