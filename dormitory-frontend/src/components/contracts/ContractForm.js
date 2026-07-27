import React, { useState, useEffect, useCallback } from "react";
import { Form, Input, Select, DatePicker, InputNumber, Modal } from "antd";
import { studentService, roomService, buildingService } from "../../services";
import { contractRules, normalizeDateValue } from "../../utils/validation";
import dayjs from "dayjs";

const { Option } = Select;

const STATUS_OPTIONS = [{ label: "Hoạt động", value: "ACTIVE" }];

function ContractForm({ visible, onCancel, onSubmit, initialValues, loading }) {
  const [form] = Form.useForm();
  const [students, setStudents] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [searchStudentText, setSearchStudentText] = useState("");

  const isEdit = !!initialValues;

  // Load buildings
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const res = await buildingService.getAll({ page: 1, limit: 200 });
        setBuildings(res.data?.data || res.data || []);
      } catch {
        setBuildings([]);
      }
    };
    loadBuildings();
  }, []);

  // Load students with debounce-like search
  useEffect(() => {
    const loadStudents = async () => {
      try {
        const params = { page: 1, limit: 50 };
        if (searchStudentText.trim()) {
          params.search = searchStudentText.trim();
        }
        const res = await studentService.getAll(params);
        setStudents(res.data?.data || res.data || []);
      } catch {
        setStudents([]);
      }
    };
    loadStudents();
  }, [searchStudentText]);

  // Load rooms when building changes
  useEffect(() => {
    const loadRooms = async () => {
      if (!selectedBuildingId) {
        setRooms([]);
        return;
      }
      try {
        const res = await roomService.getAll({
          page: 1,
          limit: 200,
          building_id: selectedBuildingId,
        });
        setRooms(res.data?.data || res.data || []);
      } catch {
        setRooms([]);
      }
    };
    loadRooms();
  }, [selectedBuildingId]);

  // Set form values when editing
  useEffect(() => {
    if (visible) {
      if (initialValues) {
        form.setFieldsValue({
          contract_code: initialValues.contractCode,
          student_id: initialValues.studentId,
          room_id: initialValues.roomId,
          start_date: normalizeDateValue(initialValues.startDate),
          end_date: normalizeDateValue(initialValues.endDate),
          deposit: initialValues.deposit,
          status: initialValues.status,
        });

        // Pre-select building from room info
        if (initialValues.room?.building?.id) {
          setSelectedBuildingId(initialValues.room.building.id);
        } else {
          // Try to load room info to get building
          const loadRoomDetail = async () => {
            try {
              const res = await roomService.getById(initialValues.roomId);
              const roomData = res.data || res;
              if (roomData?.building?.id) {
                setSelectedBuildingId(roomData.building.id);
              }
            } catch {
              // ignore
            }
          };
          loadRoomDetail();
        }
      } else {
        form.resetFields();
        setSelectedBuildingId(null);
        setSearchStudentText("");
      }
    }
  }, [visible, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      // Build snake_case payload for backend
      const payload = {
        contract_code: values.contract_code,
        student_id: values.student_id,
        room_id: values.room_id,
        start_date: values.start_date.format("YYYY-MM-DD"),
        end_date: values.end_date.format("YYYY-MM-DD"),
        deposit: values.deposit ?? 0,
      };

      // Only include status for edits
      if (isEdit && values.status) {
        payload.status = values.status;
      }

      // For create, default status is ACTIVE unless changed
      if (!isEdit && values.status) {
        payload.status = values.status;
      }

      onSubmit(payload);
    } catch (err) {
      // Form validation errors - Ant Design will display them
      if (err.errorFields) {
        return;
      }
    }
  };

  const handleStudentSearch = useCallback((value) => {
    setSearchStudentText(value);
  }, []);

  return (
    <Modal
      title={isEdit ? "Cập nhật hợp đồng" : "Tạo hợp đồng mới"}
      open={visible}
      onCancel={() => {
        form.resetFields();
        setSelectedBuildingId(null);
        setSearchStudentText("");
        onCancel();
      }}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText={isEdit ? "Cập nhật" : "Tạo hợp đồng"}
      cancelText="Hủy"
      width={700}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          deposit: 0,
          status: "ACTIVE",
        }}
      >
        <Form.Item
          name="contract_code"
          label="Mã hợp đồng"
          rules={contractRules.contract_code}
        >
          <Input placeholder="Nhập mã hợp đồng" maxLength={20} />
        </Form.Item>

        <Form.Item
          name="student_id"
          label="Sinh viên"
          rules={contractRules.student_id}
        >
          <Select
            placeholder="Tìm kiếm và chọn sinh viên"
            showSearch
            onSearch={handleStudentSearch}
            filterOption={false}
            notFoundContent="Không tìm thấy sinh viên"
            disabled={isEdit}
          >
            {students.map((s) => (
              <Option key={s.id} value={s.id}>
                {s.user?.fullName || s.studentCode || `#${s.id}`} (
                {s.studentCode})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Tòa nhà" style={{ marginBottom: 8 }}>
          <Select
            placeholder="Chọn tòa nhà"
            value={selectedBuildingId}
            onChange={(val) => {
              setSelectedBuildingId(val);
              form.setFieldsValue({ room_id: undefined });
            }}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
            allowClear
          >
            {buildings.map((b) => (
              <Option key={b.id} value={b.id}>
                {b.buildingName}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="room_id" label="Phòng" rules={contractRules.room_id}>
          <Select
            placeholder="Chọn phòng"
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
            disabled={!selectedBuildingId}
            notFoundContent={
              !selectedBuildingId
                ? "Vui lòng chọn tòa nhà trước"
                : "Không tìm thấy phòng"
            }
          >
            {rooms.map((r) => (
              <Option key={r.id} value={r.id}>
                {r.roomNumber} (Sức chứa: {r.capacity || "?"})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="start_date"
          label="Ngày bắt đầu"
          rules={contractRules.start_date}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày bắt đầu"
            disabledDate={
              !isEdit
                ? (current) => current && current < dayjs().startOf("day")
                : undefined
            }
          />
        </Form.Item>

        <Form.Item
          name="end_date"
          label="Ngày kết thúc"
          dependencies={["start_date"]}
          rules={contractRules.end_date}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            placeholder="Chọn ngày kết thúc"
            disabledDate={
              !isEdit
                ? (current) => current && current < dayjs().startOf("day")
                : undefined
            }
          />
        </Form.Item>

        <Form.Item
          name="deposit"
          label="Tiền đặt cọc"
          rules={[{ required: false }, ...contractRules.deposit]}
        >
          <InputNumber
            style={{ width: "100%" }}
            min={0}
            placeholder="Nhập số tiền đặt cọc"
            formatter={(value) =>
              `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            }
            parser={(value) => value.replace(/,/g, "")}
          />
        </Form.Item>

        {isEdit && (
          <Form.Item name="status" label="Trạng thái">
            <Select placeholder="Chọn trạng thái">
              {STATUS_OPTIONS.map((opt) => (
                <Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

export default ContractForm;
