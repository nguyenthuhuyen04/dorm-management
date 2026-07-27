import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Tooltip,
  Typography,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import * as contractService from "../../services/contractService";
import ContractFilterBar from "../../components/contracts/ContractFilterBar";
import ContractForm from "../../components/contracts/ContractForm";
import ContractDetailModal from "../../components/contracts/ContractDetailModal";
import useConfirmDialog from "../../hooks/useConfirmDialog";
import { showSuccess, handleApiError } from "../../utils/toast";

const { Title } = Typography;

const STATUS_MAP = {
  ACTIVE: { color: "green", label: "Hoạt động" },
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

function ContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    sortBy: "createdAt",
    sortOrder: "DESC",
  });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Modal states
  const [createVisible, setCreateVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editContract, setEditContract] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailContract, setDetailContract] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const { confirm: confirmDelete, ConfirmDialog } = useConfirmDialog();

  const fetchContracts = useCallback(
    async (page = 1, pageSize = 10, filterParams = {}) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: pageSize,
          ...filterParams,
        };

        // Clean up empty values
        Object.keys(params).forEach((key) => {
          if (
            params[key] === "" ||
            params[key] === undefined ||
            params[key] === null
          ) {
            delete params[key];
          }
        });

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
        handleApiError(err);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchContracts(1, pagination.pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTableChange = useCallback(
    (pag, _filters, _sorter) => {
      const currentFilters = {
        ...filters,
      };

      if (_sorter?.field) {
        currentFilters.sortBy = _sorter.field;
        currentFilters.sortOrder = _sorter.order === "ascend" ? "ASC" : "DESC";
      }

      fetchContracts(pag.current, pag.pageSize, currentFilters);
    },
    [fetchContracts, filters],
  );

  const handleFilter = useCallback(
    (filterParams) => {
      const newFilters = { ...filterParams };
      setFilters(newFilters);
      fetchContracts(1, pagination.pageSize, newFilters);
    },
    [fetchContracts, pagination.pageSize],
  );

  const handleReset = useCallback(() => {
    const defaultFilters = { sortBy: "createdAt", sortOrder: "DESC" };
    setFilters(defaultFilters);
    fetchContracts(1, pagination.pageSize, defaultFilters);
  }, [fetchContracts, pagination.pageSize]);

  // Create
  const handleCreate = async (values) => {
    setSubmitLoading(true);
    try {
      await contractService.create(values);
      showSuccess("Tạo hợp đồng thành công!");
      setCreateVisible(false);
      fetchContracts(1, pagination.pageSize, filters);
    } catch (err) {
      handleApiError(err, "Không thể tạo hợp đồng");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Edit
  const handleEdit = async (values) => {
    if (!editContract) return;
    setSubmitLoading(true);
    try {
      await contractService.update(editContract.id, values);
      showSuccess("Cập nhật hợp đồng thành công!");
      setEditVisible(false);
      setEditContract(null);
      fetchContracts(pagination.current, pagination.pageSize, filters);
    } catch (err) {
      handleApiError(err, "Không thể cập nhật hợp đồng");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete
  const handleDelete = (id) => {
    confirmDelete({
      title: "Xóa hợp đồng?",
      content:
        "Bạn có chắc chắn muốn xóa hợp đồng này? Hành động này không thể hoàn tác.",
      danger: true,
      okText: "Xóa",
      onOk: async () => {
        try {
          await contractService.remove(id);
          showSuccess("Xóa hợp đồng thành công!");
          fetchContracts(pagination.current, pagination.pageSize, filters);
        } catch (err) {
          handleApiError(err, "Không thể xóa hợp đồng");
        }
      },
    });
  };

  // View Detail
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

  // Open Edit modal
  const handleOpenEdit = async (record) => {
    try {
      const res = await contractService.getById(record.id);
      setEditContract(res.data || res);
      setEditVisible(true);
    } catch (err) {
      handleApiError(err, "Không thể tải thông tin hợp đồng");
    }
  };

  const columns = [
    {
      title: "STT",
      width: 60,
      render: (_, __, index) =>
        (pagination.current - 1) * pagination.pageSize + index + 1,
      responsive: ["xs", "sm", "md", "lg", "xl"],
    },
    {
      title: "Mã hợp đồng",
      dataIndex: "contractCode",
      key: "contractCode",
      sorter: true,
      ellipsis: true,
    },
    {
      title: "Sinh viên",
      key: "student",
      sorter: false,
      render: (_, record) =>
        record.student?.user?.fullName || record.student?.studentCode || "—",
      ellipsis: true,
      responsive: ["sm", "md", "lg", "xl"],
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
      sorter: true,
      render: (val) => formatDate(val),
      responsive: ["md", "lg", "xl"],
    },
    {
      title: "Ngày kết thúc",
      dataIndex: "endDate",
      key: "endDate",
      sorter: true,
      render: (val) => formatDate(val),
      responsive: ["lg", "xl"],
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      sorter: true,
      render: (status) => (
        <Tag color={STATUS_MAP[status]?.color || "default"}>
          {STATUS_MAP[status]?.label || status}
        </Tag>
      ),
    },
    {
      title: "Hành động",
      key: "actions",
      width: 200,
      render: (_, record) => {
        const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
        const userRole = authUser?.role;
        const isStudent = userRole === "STUDENT";
        return (
          <Space size="small">
            <Tooltip title="Xem chi tiết hợp đồng">
              <span>
                <Button
                  type="link"
                  icon={<EyeOutlined />}
                  onClick={() => handleViewDetail(record)}
                  size="small"
                >
                  Xem
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                isStudent
                  ? "Sinh viên không có quyền chỉnh sửa hợp đồng"
                  : "Chỉnh sửa hợp đồng"
              }
            >
              <span>
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => handleOpenEdit(record)}
                  size="small"
                  disabled={isStudent}
                  style={
                    isStudent ? { opacity: 0.4, cursor: "not-allowed" } : {}
                  }
                >
                  Sửa
                </Button>
              </span>
            </Tooltip>
            <Tooltip
              title={
                isStudent
                  ? "Sinh viên không có quyền xóa hợp đồng"
                  : "Xóa hợp đồng"
              }
            >
              <span>
                <Button
                  type="link"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDelete(record.id)}
                  size="small"
                  disabled={isStudent}
                  style={
                    isStudent ? { opacity: 0.4, cursor: "not-allowed" } : {}
                  }
                >
                  Xóa
                </Button>
              </span>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={3} style={{ margin: 0 }}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            Quản lý hợp đồng
          </Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditContract(null);
              setCreateVisible(true);
            }}
          >
            Tạo hợp đồng mới
          </Button>
        </Col>
      </Row>

      <ContractFilterBar
        onFilter={handleFilter}
        onReset={handleReset}
        loading={loading}
      />

      <Card>
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

      {/* Create Modal */}
      <ContractForm
        visible={createVisible}
        onCancel={() => {
          setCreateVisible(false);
          setEditContract(null);
        }}
        onSubmit={handleCreate}
        loading={submitLoading}
        initialValues={null}
      />

      {/* Edit Modal */}
      <ContractForm
        visible={editVisible}
        onCancel={() => {
          setEditVisible(false);
          setEditContract(null);
        }}
        onSubmit={handleEdit}
        loading={submitLoading}
        initialValues={editContract}
      />

      {/* Detail Modal */}
      <ContractDetailModal
        visible={detailVisible}
        onCancel={() => {
          setDetailVisible(false);
          setDetailContract(null);
        }}
        contract={detailContract}
        loading={detailLoading}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog />
    </div>
  );
}

export default ContractsPage;
