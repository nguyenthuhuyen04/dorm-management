import api from "../../api/client";

// Mock the entire api client module
jest.mock("../../api/client", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// ==================== CRUD Service Tests ====================
describe("CRUD Services", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper to dynamically import and test a CRUD service
  const testCrudService = (serviceName, endpoint, extraMethods = {}) => {
    describe(`${serviceName}`, () => {
      let service;

      beforeAll(async () => {
        const mod = await import(`../../services/${serviceName}`);
        service = mod;
      });

      test("getAll calls api.get with params", async () => {
        const params = { page: 1, limit: 10 };
        api.get.mockResolvedValue({ data: [] });

        const result = await service.getAll(params);

        expect(api.get).toHaveBeenCalledWith(endpoint, { params });
        expect(result.data).toEqual([]);
      });

      test("getAll works without params", async () => {
        api.get.mockResolvedValue({ data: [] });
        await service.getAll();
        expect(api.get).toHaveBeenCalledWith(endpoint, { params: undefined });
      });

      test("getById calls api.get with id", async () => {
        api.get.mockResolvedValue({ data: { id: 1 } });
        const result = await service.getById(1);
        expect(api.get).toHaveBeenCalledWith(`${endpoint}/1`);
        expect(result.data).toEqual({ id: 1 });
      });

      test("create calls api.post with data", async () => {
        api.post.mockResolvedValue({ data: { id: 1, name: "Test" } });
        const result = await service.create({ name: "Test" });
        expect(api.post).toHaveBeenCalledWith(endpoint, { name: "Test" });
        expect(result.data).toMatchObject({ id: 1, name: "Test" });
      });

      test("update calls api.put with id and data", async () => {
        api.put.mockResolvedValue({ data: { id: 1, name: "Updated" } });
        const result = await service.update(1, { name: "Updated" });
        expect(api.put).toHaveBeenCalledWith(`${endpoint}/1`, {
          name: "Updated",
        });
        expect(result.data).toMatchObject({ id: 1, name: "Updated" });
      });

      test("remove calls api.delete with id", async () => {
        api.delete.mockResolvedValue({ data: {} });
        const result = await service.remove(1);
        expect(api.delete).toHaveBeenCalledWith(`${endpoint}/1`);
        expect(result.data).toEqual({});
      });

      // === Error-path tests ===
      test("getAll propagates API errors", async () => {
        const error = new Error("Network error");
        api.get.mockRejectedValue(error);
        await expect(service.getAll({ page: 1 })).rejects.toThrow(
          "Network error",
        );
      });

      test("getById propagates API errors", async () => {
        const error = new Error("Not found");
        api.get.mockRejectedValue(error);
        await expect(service.getById(999)).rejects.toThrow("Not found");
      });

      test("create propagates API errors", async () => {
        const error = new Error("Validation failed");
        api.post.mockRejectedValue(error);
        await expect(service.create({})).rejects.toThrow("Validation failed");
      });

      test("update propagates API errors", async () => {
        const error = new Error("Forbidden");
        api.put.mockRejectedValue(error);
        await expect(service.update(1, {})).rejects.toThrow("Forbidden");
      });

      test("remove propagates API errors", async () => {
        const error = new Error("Server error");
        api.delete.mockRejectedValue(error);
        await expect(service.remove(1)).rejects.toThrow("Server error");
      });

      // Test extra methods if any
      Object.entries(extraMethods).forEach(([methodName, expectedEndpoint]) => {
        test(`${methodName} calls api.get with ${expectedEndpoint}`, async () => {
          api.get.mockResolvedValue({ data: {} });
          const result = await service[methodName]();
          expect(api.get).toHaveBeenCalledWith(expectedEndpoint);
          expect(result.data).toEqual({});
        });

        test(`${methodName} propagates API errors`, async () => {
          const error = new Error("Failed");
          api.get.mockRejectedValue(error);
          await expect(service[methodName]()).rejects.toThrow("Failed");
        });
      });
    });
  };

  // Standard CRUD services
  testCrudService("userService", "/users");
  testCrudService("buildingService", "/buildings");
  testCrudService("roomService", "/rooms", {
    getAvailableForRoomChange: "/rooms/available-for-room-change",
  });
  testCrudService("studentService", "/students");
  testCrudService("contractService", "/contracts");
  testCrudService("paymentService", "/payments");
  testCrudService("announcementService", "/announcements");
  testCrudService("regulationService", "/regulations");
  testCrudService("supportRequestService", "/support-requests");
  testCrudService("roomChangeRequestService", "/room-change-requests");
  testCrudService("utilityBillService", "/utility-bills");
});

// ==================== Auth Service Tests ====================
describe("authService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("login calls api.post with /auth/login and payload", async () => {
    api.post.mockResolvedValue({ data: { accessToken: "token123" } });
    const authService = await import("../../services/authService");
    const result = await authService.login({
      username: "admin",
      password: "pass123",
    });
    expect(api.post).toHaveBeenCalledWith("/auth/login", {
      username: "admin",
      password: "pass123",
    });
    expect(result.data.accessToken).toBe("token123");
  });

  test("login propagates API errors", async () => {
    api.post.mockRejectedValue(new Error("Invalid credentials"));
    const authService = await import("../../services/authService");
    await expect(authService.login({})).rejects.toThrow("Invalid credentials");
  });

  test("logout calls api.post with /auth/logout", async () => {
    api.post.mockResolvedValue({ data: {} });
    const authService = await import("../../services/authService");
    const result = await authService.logout();
    expect(api.post).toHaveBeenCalledWith("/auth/logout");
    expect(result.data).toEqual({});
  });

  test("getProfile calls api.get with /users/me", async () => {
    api.get.mockResolvedValue({ data: { id: 1, username: "admin" } });
    const authService = await import("../../services/authService");
    const result = await authService.getProfile();
    expect(api.get).toHaveBeenCalledWith("/users/me");
    expect(result.data).toMatchObject({ id: 1, username: "admin" });
  });
});

// ==================== Dashboard Service Tests ====================
describe("dashboardService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getDashboard calls api.get with /dashboard", async () => {
    api.get.mockResolvedValue({ data: { totalUsers: 100 } });
    const dashboardService = await import("../../services/dashboardService");
    const result = await dashboardService.getDashboard();
    expect(api.get).toHaveBeenCalledWith("/dashboard");
    expect(result.data).toMatchObject({ totalUsers: 100 });
  });

  test("getDashboard propagates API errors", async () => {
    api.get.mockRejectedValue(new Error("Dashboard unavailable"));
    const dashboardService = await import("../../services/dashboardService");
    await expect(dashboardService.getDashboard()).rejects.toThrow(
      "Dashboard unavailable",
    );
  });

  test("getStudentDashboard calls api.get with /dashboard/student", async () => {
    api.get.mockResolvedValue({ data: { myContracts: [] } });
    const dashboardService = await import("../../services/dashboardService");
    const result = await dashboardService.getStudentDashboard();
    expect(api.get).toHaveBeenCalledWith("/dashboard/student");
    expect(result.data).toMatchObject({ myContracts: [] });
  });
});
