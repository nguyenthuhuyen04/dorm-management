import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminDashboard from "../../pages/AdminDashboard";

// ==================== MOCKS ====================

// Mock antd completely - using the __mocks__/antd.js
jest.mock("antd");

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// Mock services
jest.mock("../../services", () => ({
  dashboardService: {
    getDashboard: jest.fn(),
  },
}));

const { dashboardService } = require("../../services");

// ==================== HELPER ====================

function setupLocalStorage(overrides = {}) {
  const defaultUser = {
    id: 1,
    username: "admin",
    fullName: "Admin User",
    role: "ADMIN",
    ...overrides,
  };
  const store = {
    authUser: JSON.stringify(defaultUser),
  };
  jest
    .spyOn(Storage.prototype, "getItem")
    .mockImplementation((key) => store[key] || null);
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
  jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {});
}

function createMockDashboardData(overrides = {}) {
  return {
    data: {
      users: { total: 150 },
      buildings: { total: 5 },
      rooms: {
        total: 50,
        occupied: 35,
        available: 12,
        maintenance: 3,
      },
      students: { total: 120 },
      contracts: {
        total: 100,
        active: 80,
        expired: 10,
        pending: 10,
      },
      payments: {
        total: 200,
        paid: 150,
        pending: 30,
        overdue: 20,
      },
      supportRequests: {
        pending: 5,
        processing: 3,
        resolved: 20,
        total: 28,
      },
      roomChangeRequests: {
        pending: 2,
        approved: 5,
        rejected: 1,
        total: 8,
      },
      ...overrides,
    },
  };
}

// ==================== TESTS ====================

describe("AdminDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLocalStorage();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---- LOADING STATE ----
  test("renders loading state while fetching data", async () => {
    dashboardService.getDashboard.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      render(<AdminDashboard />);
    });

    expect(screen.getByText("Đang tải dữ liệu...")).toBeInTheDocument();
  });

  // ---- ERROR STATE ----
  test("renders error state when API call fails", async () => {
    dashboardService.getDashboard.mockRejectedValue({
      response: { data: { message: "Server error" } },
    });

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Lỗi")).toBeInTheDocument();
    });
    expect(screen.getByText("Server error")).toBeInTheDocument();
  });

  test("renders error state with fallback message when no response", async () => {
    dashboardService.getDashboard.mockRejectedValue(new Error("Network Error"));

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(
        screen.getByText("Không thể tải dữ liệu dashboard"),
      ).toBeInTheDocument();
    });
  });

  // ---- NULL DATA ----
  test("returns null when data is null after loading", async () => {
    dashboardService.getDashboard.mockResolvedValue({ data: null });

    const { container } = render(<AdminDashboard />);

    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  // ---- SUCCESS STATE ----
  test("renders welcome message with admin full name", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chào mừng, Admin User!/)).toBeInTheDocument();
    });
  });

  test("renders welcome message with username when fullName missing", async () => {
    setupLocalStorage({ fullName: undefined });
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText(/Chào mừng, admin!/)).toBeInTheDocument();
    });
  });

  test("renders statistic cards with correct values", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Tổng số người dùng")).toBeInTheDocument();
      expect(screen.getByText("Tòa nhà")).toBeInTheDocument();
      expect(screen.getByText("Phòng (Đã thuê/Trống)")).toBeInTheDocument();
      expect(screen.getByText("Sinh viên")).toBeInTheDocument();
      expect(screen.getByText("Hợp đồng")).toBeInTheDocument();
      expect(screen.getByText("Giao dịch thanh toán")).toBeInTheDocument();
    });

    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("35/12")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();
  });

  // ---- NAVIGATION ----
  test("navigates to users page when user card is clicked", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    const userCard = await screen.findByText("Tổng số người dùng");
    // Click the parent card element
    const cardDiv = userCard.closest("[data-hoverable]");
    if (cardDiv) {
      await userEvent.click(cardDiv);
      expect(mockNavigate).toHaveBeenCalledWith("/admin/users");
    }
  });

  test("navigates to buildings page when building card is clicked", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    const buildingCard = await screen.findByText("Tòa nhà");
    const cardDiv = buildingCard.closest("[data-hoverable]");
    if (cardDiv) {
      await userEvent.click(cardDiv);
      expect(mockNavigate).toHaveBeenCalledWith("/admin/buildings");
    }
  });

  test("navigates to students page", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    const studentCard = await screen.findByText("Sinh viên");
    const cardDiv = studentCard.closest("[data-hoverable]");
    if (cardDiv) {
      await userEvent.click(cardDiv);
      expect(mockNavigate).toHaveBeenCalledWith("/admin/students");
    }
  });

  test("navigates to contracts page", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    const contractCard = await screen.findByText("Hợp đồng");
    const cardDiv = contractCard.closest("[data-hoverable]");
    if (cardDiv) {
      await userEvent.click(cardDiv);
      expect(mockNavigate).toHaveBeenCalledWith("/admin/contracts");
    }
  });

  test("navigates to payments page", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    const paymentCard = await screen.findByText("Giao dịch thanh toán");
    const cardDiv = paymentCard.closest("[data-hoverable]");
    if (cardDiv) {
      await userEvent.click(cardDiv);
      expect(mockNavigate).toHaveBeenCalledWith("/admin/payments");
    }
  });

  // ---- ACTION BUTTONS ----
  test("renders action buttons in welcome card", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Quản lý phòng")).toBeInTheDocument();
      expect(screen.getByText("Xem thông báo")).toBeInTheDocument();
    });
  });

  // ---- TODAY STATUS SECTION ----
  test("renders today status card with available rooms and pending requests", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Tình trạng hôm nay")).toBeInTheDocument();
      expect(screen.getByText("Đang hoạt động tốt")).toBeInTheDocument();
      expect(screen.getByText("Yêu cầu chờ xử lý")).toBeInTheDocument();
    });
  });

  test("shows correct pending count in status card", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("7")).toBeInTheDocument();
    });
  });

  // ---- RECENT ACTIVITY SECTION ----
  test("renders recent activity section with support requests", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Hoạt động gần đây")).toBeInTheDocument();
      expect(screen.getByText("Yêu cầu hỗ trợ")).toBeInTheDocument();
    });
  });

  test("renders recent activity section with contracts", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Hợp đồng sắp hết hạn")).toBeInTheDocument();
    });
  });

  test("renders recent activity section with payments", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Thanh toán")).toBeInTheDocument();
    });
  });

  // ---- ROOM UTILIZATION SECTION ----
  test("renders room utilization card with title", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("Tỷ lệ sử dụng phòng")).toBeInTheDocument();
    });
  });

  test("renders occupancy progress with correct percentage", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText("line: 70%")).toBeInTheDocument();
    });
  });

  test("renders occupancy rate as 0 when no rooms total", async () => {
    const data = createMockDashboardData();
    data.data.rooms = { total: 0, occupied: 0, available: 0, maintenance: 0 };
    dashboardService.getDashboard.mockResolvedValue(data);

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      const progressBars = screen.getAllByText("line: 0%");
      expect(progressBars.length).toBe(3);
    });
  });

  test('navigates to support requests when "Xem tất cả" clicked', async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    const viewAll = await screen.findByText("Xem tất cả");
    await userEvent.click(viewAll);

    expect(mockNavigate).toHaveBeenCalledWith("/admin/support-requests");
  });

  // ---- API CALL ----
  test("calls dashboard API exactly once on mount", async () => {
    dashboardService.getDashboard.mockResolvedValue(createMockDashboardData());

    await act(async () => {
      render(<AdminDashboard />);
    });

    await waitFor(() => {
      expect(dashboardService.getDashboard).toHaveBeenCalledTimes(1);
    });
  });
});
