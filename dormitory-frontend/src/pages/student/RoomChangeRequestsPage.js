import React, { useEffect, useState, useCallback } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Space,
  Alert,
  Spin,
  message,
  Descriptions,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  roomChangeRequestService,
  contractService,
  studentService,
  roomService,
} from "../../services";
import { showSuccess } from "../../utils/toast";

const { Title } = Typography;
const { TextArea } = Input;

const STATUS_MAP = {
  PENDING: { color: "orange", label: "Chờ duyệt" },
  APPROVED: { color: "green", label: "Đã duyệt" },
  REJECTED: { color: "red", label: "Từ chối" },
};

const STATUS_ORDER = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

function RoomChangeRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Student info
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentLoading, setStudentLoading] = useState(true);

  // Active contract
  const [activeContract, setActiveContract] = useState(null);
  const [contractChecked, setContractChecked] = useState(false);

  // Available rooms
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const [form] = Form.useForm();

  const getBackendErrorMsg = (err) => {
    if (!err?.response?.data) return null;
    const data = err.response.data;
    if (typeof data.message === "string") return data.message;
    if (Array.isArray(data.message) && data.message.length > 0)
      return data.message[0];
    if (typeof data.error === "string") return data.error;
    return null;
  };

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roomChangeRequestService.getAll({
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "DESC",
      });
      const payload = res?.data?.data || res?.data || [];
      const list = Array.isArray(payload) ? payload : [];
      list.sort(
        (a, b) =>
          (STATUS_ORDER[a.status] || 99) - (STATUS_ORDER[b.status] || 99),
      );
      setRequests(list);
    } catch (err) {
      const msg =
        getBackendErrorMsg(err) || "Không thể tải danh sách yêu cầu đổi phòng";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentStudent = useCallback(async () => {
    setStudentLoading(true);
    try {
      // Backend tự động scope theo user đang đăng nhập khi role STUDENT
      const res = await studentService.getAll({ page: 1, limit: 10 });
      const data = res?.data?.data || res?.data || [];
      const students = Array.isArray(data) ? data : [];
      if (students.length > 0) {
        setCurrentStudent(students[0]);
      }
    } catch (err) {
      setCurrentStudent(null);
    } finally {
      setStudentLoading(false);
    }
  }, []);

  const checkActiveContract = useCallback(async () => {
    try {
      const res = await contractService.getAll({
        page: 1,
        limit: 10,
        status: "ACTIVE",
      });
      const data = res?.data?.data || res?.data || [];
      const contracts = Array.isArray(data) ? data : [];
      setActiveContract(contracts.length > 0 ? contracts[0] : null);
    } catch (err) {
      setActiveContract(null);
    } finally {
      setContractChecked(true);
    }
  }, []);

  const loadAvailableRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await roomService.getAvailableForRoomChange();
      const data = res?.data || [];
      const rooms = Array.isArray(data) ? data : [];
      setAvailableRooms(rooms);
    } catch (err) {
      setAvailableRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadCurrentStudent();
    checkActiveContract();
    loadAvailableRooms();
  }, [
    loadRequests,
    loadCurrentStudent,
    checkActiveContract,
    loadAvailableRooms,
  ]);

  const handleOpenCreate = () => {
    form.resetFields();
    setCreateVisible(true);
  };

  const handleCreate = async (values) => {
    if (!currentStudent) {
      message.error("Không tìm thấy thông tin sinh viên của bạn.");
      return;
    }
    if (!activeContract) {
      message.error("Bạn chưa có hợp đồng còn hiệu lực.");
      return;
    }

    // Validate not selecting current room
    const currentRoomId = activeContract.roomId || activeContract.room?.id;
    if (Number(values.requestedRoomId) === Number(currentRoomId)) {
      message.error("Phòng muốn chuyển phải khác phòng hiện tại.");
      return;
    }

    setSubmitting(true);
    try {
      await roomChangeRequestService.create({
        studentId: currentStudent.id,
        requestedRoomId: Number(values.requestedRoomId),
        reason: values.reason.trim(),
      });
      showSuccess("Gửi yêu cầu đổi phòng thành công.");
      setCreateVisible(false);
      form.resetFields();
      loadRequests();
    } catch (err) {
      const backendMsg = getBackendErrorMsg(err);
      if (backendMsg) {
        message.error(backendMsg);
      } else {
        message.error("Không thể gửi yêu cầu đổi phòng.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Lọc phòng khả dụng: còn chỗ, không phải phòng hiện tại
  const currentRoomId = activeContract
    ? activeContract.roomId || activeContract.room?.id
    : null;

  const roomOptions = availableRooms
    .filter((room) => {
      if (Number(room.id) === Number(currentRoomId)) return false;
      if (room.availableSlots !== undefined && room.availableSlots <= 0)
        return false;
      return true;
    })
    .map((room) => ({
      label: `${room.roomNumber} - ${room.building?.buildingName || ""} (${
        room.availableSlots !== undefined
          ? `Còn ${room.availableSlots} chỗ`
          : `Sức chứa ${room.capacity}`
      })`,
      value: room.id,
    }));

  const columns = [
    {
      title: "Phòng hiện tại",
      key: "currentRoom",
      width: 140,
      render: (_, record) => {
        const room = record.currentRoom;
        const building = room?.building;
        return building
          ? `${room.roomNumber} (${building.buildingName})`
          : room?.roomNumber || "—";
      },
    },
    {
      title: "Phòng mong muốn",
      key: "requestedRoom",
      width: 140,
      render: (_, record) => {
        const room = record.requestedRoom;
        const building = room?.building;
        return building
          ? `${room.roomNumber} (${building.buildingName})`
          : room?.roomNumber || "—";
      },
    },
    {
      title: "Lý do",
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <Tag color={STATUS_MAP[status]?.color || "default"}>
          {STATUS_MAP[status]?.label || status}
        </Tag>
      ),
    },
    {
      title: "Người duyệt",
      key: "approver",
      width: 150,
      render: (_, record) => {
        if (record.status === "PENDING") return "—";
        return record.approver?.fullName || "—";
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (val) => (val ? new Date(val).toLocaleDateString("vi-VN") : "—"),
    },
    {
      title: "Cập nhật",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 120,
      render: (val) => (val ? new Date(val).toLocaleDateString("vi-VN") : "—"),
    },
  ];

  const isLoading = studentLoading || !contractChecked;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        Yêu cầu đổi phòng
      </Title>

      {isLoading ? (
        <Card>
          <Spin description="Đang tải thông tin..." />
        </Card>
      ) : !currentStudent ? (
        <Card>
          <Alert
            type="error"
            message="Không tìm thấy thông tin sinh viên."
            description="Vui lòng đăng nhập lại hoặc liên hệ quản trị viên."
          />
        </Card>
      ) : !activeContract ? (
        <Card>
          <Alert
            type="warning"
            message="Bạn chưa có hợp đồng còn hiệu lực."
            description="Bạn cần có hợp đồng đang hoạt động để gửi yêu cầu đổi phòng."
            style={{ marginBottom: 16 }}
          />
          <Title level={5} style={{ marginTop: 16 }}>
            Lịch sử yêu cầu đổi phòng
          </Title>
          <Table
            rowKey="id"
            dataSource={requests}
            columns={columns}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      ) : (
        <Card>
          {/* Hiển thị thông tin phòng hiện tại */}
          <Descriptions
            title="Thông tin hợp đồng hiện tại"
            size="small"
            bordered
            column={2}
            style={{ marginBottom: 16 }}
          >
            <Descriptions.Item label="Mã hợp đồng">
              {activeContract.contractCode || "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color="green">Đang hiệu lực</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Phòng hiện tại">
              <strong>
                {activeContract.room?.roomNumber || "—"}
                {activeContract.room?.building
                  ? ` (${activeContract.room.building.buildingName})`
                  : ""}
              </strong>
            </Descriptions.Item>
            <Descriptions.Item label="Từ ngày - Đến ngày">
              {activeContract.startDate
                ? new Date(activeContract.startDate).toLocaleDateString("vi-VN")
                : "—"}{" "}
              ~{" "}
              {activeContract.endDate
                ? new Date(activeContract.endDate).toLocaleDateString("vi-VN")
                : "—"}
            </Descriptions.Item>
          </Descriptions>

          <div style={{ marginBottom: 16, textAlign: "right" }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
            >
              Gửi yêu cầu đổi phòng
            </Button>
          </div>

          <Title level={5}>Lịch sử yêu cầu đổi phòng</Title>
          <Table
            rowKey="id"
            dataSource={requests}
            columns={columns}
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}

      <Modal
        title="Gửi yêu cầu đổi phòng"
        open={createVisible}
        onCancel={() => setCreateVisible(false)}
        footer={null}
        width={600}
        destroyOnHidden={false}
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          {/* Current room - read only */}
          <Form.Item label="Phòng hiện tại">
            <Input
              value={
                activeContract
                  ? `${activeContract.room?.roomNumber || "—"} ${
                      activeContract.room?.building
                        ? `(${activeContract.room.building.buildingName})`
                        : ""
                    }`
                  : "—"
              }
              disabled
              style={{ color: "#333", fontWeight: 500 }}
            />
          </Form.Item>

          {/* Requested room - select */}
          <Form.Item
            name="requestedRoomId"
            label="Phòng muốn chuyển đến"
            rules={[
              {
                required: true,
                message: "Vui lòng chọn phòng muốn chuyển đến",
              },
            ]}
          >
            <Select
              loading={roomsLoading}
              placeholder="Chọn phòng..."
              options={roomOptions}
              showSearch
              optionFilterProp="label"
              notFoundContent={
                roomsLoading ? <Spin size="small" /> : "Không có phòng khả dụng"
              }
            />
          </Form.Item>

          {/* Reason */}
          <Form.Item
            name="reason"
            label="Lý do đổi phòng"
            rules={[
              { required: true, message: "Vui lòng nhập lý do đổi phòng" },
              {
                min: 10,
                message: "Lý do phải có ít nhất 10 ký tự",
              },
              {
                max: 500,
                message: "Lý do không được vượt quá 500 ký tự",
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Nhập lý do đổi phòng (tối thiểu 10 ký tự)..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setCreateVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Gửi yêu cầu
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

export default RoomChangeRequestsPage;
