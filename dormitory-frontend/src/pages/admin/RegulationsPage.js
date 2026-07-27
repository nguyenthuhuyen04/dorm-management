import React, { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import { regulationService } from "../../services";
import { showSuccess, handleApiError } from "../../utils/toast";
import useConfirmDialog from "../../hooks/useConfirmDialog";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import RetryError from "../../components/common/RetryError";
import {
  canManageRegulations,
  getCurrentUserRole,
} from "../../utils/permissions";

const { Title } = Typography;

function RegulationsPage() {
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchText, setSearchText] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRegulation, setEditingRegulation] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const currentRole = getCurrentUserRole();
  const canManage = canManageRegulations(currentRole);

  const fetchRegulations = useCallback(
    async (page = 1, limit = 10) => {
      try {
        setLoading(true);
        setError(null);
        const response = await regulationService.getAll({
          page,
          limit,
          search: searchText || undefined,
        });
        const data = response.data;
        if (Array.isArray(data)) {
          setRegulations(data);
          setPagination((prev) => ({
            ...prev,
            current: page,
            total: data.length,
          }));
        } else {
          setRegulations(data.data || []);
          setPagination({
            current: data.page || page,
            pageSize: data.limit || limit,
            total: data.total || 0,
          });
        }
      } catch (err) {
        setError(
          err.response?.data?.message || "Không thể tải danh sách nội quy",
        );
        handleApiError(err, "Không thể tải danh sách nội quy");
      } finally {
        setLoading(false);
      }
    },
    [searchText],
  );

  useEffect(() => {
    fetchRegulations();
  }, [fetchRegulations]);

  const handleSearch = () => fetchRegulations(1, pagination.pageSize);

  const handleReset = () => setSearchText("");

  const openCreateModal = () => {
    setEditingRegulation(null);
    setModalVisible(true);
  };

  const openEditModal = (regulation) => {
    setEditingRegulation(regulation);
    setModalVisible(true);
  };

  const handleModalAfterOpen = () => {
    if (editingRegulation) {
      form.setFieldsValue({
        title: editingRegulation.title,
        content: editingRegulation.content,
      });
    } else {
      form.resetFields();
    }
  };

  const handleDelete = (regulation) => {
    confirm({
      title: "Xóa nội quy",
      content: `Bạn có chắc chắn muốn xóa nội quy "${regulation.title}"?`,
      danger: true,
      onOk: async () => {
        try {
          await regulationService.remove(regulation.id);
          showSuccess("Xóa nội quy thành công");
          fetchRegulations(pagination.current, pagination.pageSize);
        } catch (err) {
          handleApiError(err, "Không thể xóa nội quy");
        }
      },
    });
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      if (editingRegulation) {
        await regulationService.update(editingRegulation.id, values);
        showSuccess("Cập nhật nội quy thành công");
      } else {
        await regulationService.create(values);
        showSuccess("Tạo nội quy thành công");
      }
      setModalVisible(false);
      form.resetFields();
      fetchRegulations(pagination.current, pagination.pageSize);
    } catch (err) {
      if (err.errorFields) return;
      handleApiError(
        err,
        editingRegulation
          ? "Không thể cập nhật nội quy"
          : "Không thể tạo nội quy",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
    },
    { title: "Tiêu đề", dataIndex: "title", key: "title" },
    {
      title: "Nội dung",
      dataIndex: "content",
      key: "content",
      render: (text) =>
        text?.length > 100 ? `${text.slice(0, 100)}...` : text || "—",
    },
    {
      title: "Người tạo",
      key: "creator",
      render: (_, record) => record.creator?.fullName || "—",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 140,
      render: (_, record) =>
        canManage ? (
          <Space>
            <Tooltip title="Chỉnh sửa">
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => openEditModal(record)}
              />
            </Tooltip>
            <Tooltip title="Xóa">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDelete(record)}
              />
            </Tooltip>
          </Space>
        ) : null,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              <ReadOutlined style={{ marginRight: 8 }} />
              Quản lý nội quy
            </Title>
            <Typography.Text type="secondary">
              Quản lý các quy định và nội quy của ký túc xá.
            </Typography.Text>
          </Col>
          <Col>
            {canManage ? (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={openCreateModal}
              >
                Tạo nội quy
              </Button>
            ) : null}
          </Col>
        </Row>
      </Card>
      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={18} md={18}>
            <Input
              placeholder="Tìm tiêu đề hoặc nội dung"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={12} sm={3} md={3}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              block
            >
              Tìm
            </Button>
          </Col>
          <Col xs={12} sm={3} md={3}>
            <Button icon={<ReloadOutlined />} onClick={handleReset} block>
              Reset
            </Button>
          </Col>
        </Row>
        {loading ? (
          <LoadingState message="Đang tải danh sách nội quy..." />
        ) : error ? (
          <RetryError message={error} onRetry={() => fetchRegulations()} />
        ) : regulations.length === 0 ? (
          <EmptyState
            title="Chưa có nội quy nào"
            description={
              canManage
                ? "Nhấn 'Tạo nội quy' để thêm mới."
                : "Chưa có nội quy nào."
            }
          />
        ) : (
          <Table
            columns={columns}
            dataSource={regulations}
            rowKey="id"
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} của ${total} nội quy`,
            }}
            onChange={(pag) => fetchRegulations(pag.current, pag.pageSize)}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
      <Modal
        title={editingRegulation ? "Chỉnh sửa nội quy" : "Tạo nội quy mới"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        afterOpenChange={handleModalAfterOpen}
        confirmLoading={submitting}
        width={700}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            label="Tiêu đề"
            name="title"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
          >
            <Input placeholder="Nhập tiêu đề" />
          </Form.Item>
          <Form.Item
            label="Nội dung"
            name="content"
            rules={[{ required: true, message: "Vui lòng nhập nội dung" }]}
          >
            <Input.TextArea rows={8} placeholder="Nhập nội dung nội quy" />
          </Form.Item>
        </Form>
      </Modal>
      <ConfirmDialog />
    </div>
  );
}

export default RegulationsPage;
