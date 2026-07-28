import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import UsersPage from "../../../pages/admin/UsersPage";

// Manual mock for antd lives in src/__mocks__/antd.js
// This avoids the "jest.mock() cannot reference out-of-scope variables" error
jest.mock("antd");

// Mock @ant-design/icons to prevent "Element type is invalid" errors
jest.mock("@ant-design/icons", () => ({
  PlusOutlined: () => null,
  EditOutlined: () => null,
  DeleteOutlined: () => null,
  SearchOutlined: () => null,
  ReloadOutlined: () => null,
  UserOutlined: () => null,
}));

jest.mock("../../../services", () => ({
  userService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock("../../../utils/toast", () => ({
  showSuccess: jest.fn(),
  handleApiError: jest.fn(),
}));

jest.mock("../../../hooks/useConfirmDialog", () => ({
  __esModule: true,
  default: () => ({
    confirm: jest.fn(),
    close: jest.fn(),
    ConfirmDialog: () => null,
  }),
}));

jest.mock("../../../utils/constants", () => ({
  ROLES: { ADMIN: "ADMIN", MANAGER: "MANAGER", STUDENT: "STUDENT" },
}));

jest.mock("../../../utils/validation", () => ({
  userRules: {
    username: [
      { required: true, message: "Vui lòng nhập tên đăng nhập" },
      { min: 3, message: "Tên đăng nhập phải có ít nhất 3 ký tự" },
      { max: 50, message: "Tên đăng nhập tối đa 50 ký tự" },
    ],
    password: [
      { required: true, message: "Vui lòng nhập mật khẩu" },
      { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
    ],
    email: [
      { required: true, message: "Vui lòng nhập Email" },
      { type: "email", message: "Email không hợp lệ" },
    ],
    fullName: [
      { required: true, message: "Vui lòng nhập họ và tên" },
      { min: 2, message: "Họ tên phải có ít nhất 2 ký tự" },
      { max: 100, message: "Họ và tên tối đa 100 ký tự" },
    ],
    phone: [
      {
        pattern: /^\+?[0-9\s()-]{7,15}$/,
        message: "Số điện thoại không hợp lệ",
      },
    ],
  },
  passwordRules: [
    { required: true, message: "Vui lòng nhập mật khẩu" },
    { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự" },
  ],
  default: { user: {} },
}));

jest.mock("../../../components/common/LoadingState", () => {
  const MockComp = (props) => {
    const r = require("react");
    return r.createElement(
      "div",
      { "data-testid": "loading-state" },
      props.message || "Đang tải dữ liệu...",
    );
  };
  return MockComp;
});

jest.mock("../../../components/common/EmptyState", () => {
  const MockComp = (props) => {
    const r = require("react");
    return r.createElement(
      "div",
      { "data-testid": "empty-state" },
      props.title ? r.createElement("div", null, props.title) : null,
      r.createElement("div", null, props.description || "Không có dữ liệu"),
    );
  };
  return MockComp;
});

jest.mock("../../../components/common/RetryError", () => {
  const MockComp = (props) => {
    const r = require("react");
    return r.createElement(
      "div",
      { "data-testid": "error-state" },
      r.createElement("div", null, props.message || "Error"),
      r.createElement("button", { onClick: props.onRetry }, "Thử lại"),
    );
  };
  return MockComp;
});

const { userService } = require("../../../services");

function setupLocalStorage(role = "ADMIN") {
  const store = {
    authUser: JSON.stringify({
      role,
      id: role === "ADMIN" ? 1 : 2,
      username: role === "ADMIN" ? "admin" : "manager",
    }),
  };
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockImplementation((key) => store[key] || null);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
}

describe("UsersPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLocalStorage("ADMIN");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders page title and description", async () => {
    userService.getAll.mockResolvedValue({ data: [] });
    await act(async () => {
      render(<UsersPage />);
    });
    expect(screen.getByText("Quản lý người dùng")).toBeInTheDocument();
  });

  test("renders create user button for admin", async () => {
    userService.getAll.mockResolvedValue({ data: [] });
    await act(async () => {
      render(<UsersPage />);
    });
    expect(
      screen.getByRole("button", { name: "Tạo người dùng" }),
    ).toBeInTheDocument();
  });

  test("renders loading state initially", async () => {
    userService.getAll.mockReturnValue(new Promise(() => {}));
    await act(async () => {
      render(<UsersPage />);
    });
    await waitFor(() => {
      expect(
        screen.getByText("Đang tải danh sách người dùng..."),
      ).toBeInTheDocument();
    });
  });

  test("renders empty state when no users", async () => {
    userService.getAll.mockResolvedValue({ data: [] });
    await act(async () => {
      render(<UsersPage />);
    });
    expect(
      await screen.findByText("Chưa có người dùng nào"),
    ).toBeInTheDocument();
  });

  test("renders table with user data", async () => {
    const mockUsers = [
      {
        id: 1,
        username: "admin",
        fullName: "Admin User",
        email: "admin@test.com",
        phone: "0123456789",
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        id: 2,
        username: "student1",
        fullName: "Student One",
        email: "student1@test.com",
        phone: "0987654321",
        role: "STUDENT",
        status: "ACTIVE",
      },
    ];
    userService.getAll.mockResolvedValue({ data: mockUsers });
    await act(async () => {
      render(<UsersPage />);
    });
    expect(await screen.findByText("admin")).toBeInTheDocument();
    expect(await screen.findByText("student1")).toBeInTheDocument();
    expect(await screen.findByText("Admin User")).toBeInTheDocument();
  });

  test("renders error state when request fails", async () => {
    userService.getAll.mockRejectedValue({
      response: { data: { message: "Lỗi máy chủ" } },
    });
    let container;
    await act(async () => {
      container = render(<UsersPage />);
    });
    expect(await screen.findByTestId("error-state")).toBeInTheDocument();
  });

  test("does not render create button for non-admin", async () => {
    jest.restoreAllMocks();
    setupLocalStorage("MANAGER");

    userService.getAll.mockResolvedValue({ data: [] });
    await act(async () => {
      render(<UsersPage />);
    });
    await screen.findByText("Quản lý người dùng");
    expect(
      screen.queryByRole("button", { name: "Tạo người dùng" }),
    ).not.toBeInTheDocument();
  });
});
