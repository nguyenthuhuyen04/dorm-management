import React, { useState, useEffect, useCallback } from "react";
import { Row, Col, Input, Select, DatePicker, Button, Space, Card } from "antd";
import { SearchOutlined, ClearOutlined } from "@ant-design/icons";
import { buildingService, roomService } from "../../services";

const { RangePicker } = DatePicker;
const { Option } = Select;

const STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Hoạt động", value: "ACTIVE" },
];

const SORT_OPTIONS = [
  { label: "Mới nhất", value: "createdAt_DESC" },
  { label: "Cũ nhất", value: "createdAt_ASC" },
  { label: "Mã hợp đồng (A-Z)", value: "contractCode_ASC" },
  { label: "Mã hợp đồng (Z-A)", value: "contractCode_DESC" },
  { label: "Ngày bắt đầu (sớm)", value: "startDate_ASC" },
  { label: "Ngày bắt đầu (muộn)", value: "startDate_DESC" },
  { label: "Ngày kết thúc (sớm)", value: "endDate_ASC" },
  { label: "Ngày kết thúc (muộn)", value: "endDate_DESC" },
];

function ContractFilterBar({ onFilter, onReset, loading }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [buildingName, setBuildingName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [sortValue, setSortValue] = useState("createdAt_DESC");

  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);

  // Load buildings
  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const res = await buildingService.getAll({ page: 1, limit: 100 });
        setBuildings(res.data?.data || res.data || []);
      } catch {
        setBuildings([]);
      }
    };
    loadBuildings();
  }, []);

  // Load rooms when building changes (send building name for filter)
  useEffect(() => {
    const loadRooms = async () => {
      if (!buildingName) {
        setRooms([]);
        setRoomName("");
        return;
      }
      try {
        const res = await roomService.getAll({
          page: 1,
          limit: 200,
          building_id: buildingName,
        });
        setRooms(res.data?.data || res.data || []);
      } catch {
        setRooms([]);
      }
    };
    loadRooms();
  }, [buildingName]);

  const handleFilter = useCallback(() => {
    const params = {};

    if (search.trim()) params.search = search.trim();
    if (status) params.status = status;
    if (buildingName) params.building = buildingName;
    if (roomName) params.room = roomName;
    if (studentSearch.trim()) params.student = studentSearch.trim();

    if (dateRange && dateRange[0] && dateRange[1]) {
      params.start_date = dateRange[0].format("YYYY-MM-DD");
      params.end_date = dateRange[1].format("YYYY-MM-DD");
    }

    if (sortValue) {
      const [sortBy, sortOrder] = sortValue.split("_");
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
    }

    onFilter(params);
  }, [
    search,
    status,
    buildingName,
    roomName,
    studentSearch,
    dateRange,
    sortValue,
    onFilter,
  ]);

  const handleReset = useCallback(() => {
    setSearch("");
    setStatus("");
    setBuildingName("");
    setRoomName("");
    setStudentSearch("");
    setDateRange(null);
    setSortValue("createdAt_DESC");
    onReset();
  }, [onReset]);

  return (
    <Card style={{ marginBottom: 16 }}>
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Input
            placeholder="Tìm kiếm (mã hợp đồng, sinh viên, phòng...)"
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={setStatus}
            style={{ width: "100%" }}
            allowClear
          >
            {STATUS_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Select
            placeholder="Tòa nhà"
            value={buildingName}
            onChange={(val) => {
              setBuildingName(val);
              setRoomName("");
            }}
            style={{ width: "100%" }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {buildings.map((b) => (
              <Option key={b.id} value={b.buildingName}>
                {b.buildingName}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Select
            placeholder="Phòng"
            value={roomName}
            onChange={setRoomName}
            style={{ width: "100%" }}
            allowClear
            disabled={!buildingName}
            showSearch
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {rooms.map((r) => (
              <Option key={r.id} value={r.roomNumber}>
                {r.roomNumber}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Input
            placeholder="Sinh viên"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
          />
        </Col>
        <Col xs={12} sm={6} md={2}>
          <Select
            value={sortValue}
            onChange={setSortValue}
            style={{ width: "100%" }}
          >
            {SORT_OPTIONS.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={3}>
          <Space>
            <Button
              type="primary"
              onClick={handleFilter}
              loading={loading}
              icon={<SearchOutlined />}
            >
              Lọc
            </Button>
            <Button onClick={handleReset} icon={<ClearOutlined />}>
              Xóa
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

export default ContractFilterBar;
