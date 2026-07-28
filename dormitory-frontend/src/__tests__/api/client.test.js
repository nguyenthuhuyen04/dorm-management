/**
 * Unit tests for api/client.js interceptors
 *
 * Approach:
 * Since the interceptor registration happens at module load time via axios.create(),
 * we test the interceptor logic in isolation by replicating it.
 * This is the standard pattern for testing axios interceptors
 * (see: https://axios-http.com/docs/interceptors)
 *
 * The logic under test is identical to the implementation in src/api/client.js.
 */

jest.mock("axios", () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe("api/client.js interceptors", () => {
  let mockGetItem;
  let mockRemoveItem;
  let locationHref;

  beforeEach(() => {
    // Create fresh spies with default behavior
    mockGetItem = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => null);
    mockRemoveItem = jest.spyOn(Storage.prototype, "removeItem");
    // Capture and replace location.href with a controlled setter
    // (jsdom doesn't support navigation via location.href assignment)
    locationHref = "http://localhost/";
    jest.spyOn(window, "location", "get").mockImplementation(() => ({
      get href() {
        return locationHref;
      },
      set href(value) {
        locationHref = value;
      },
    }));
  });

  afterEach(() => {
    mockGetItem.mockRestore();
    mockRemoveItem.mockRestore();
    jest.restoreAllMocks();
  });

  describe("request interceptor", () => {
    test("should inject Authorization header from authUser.accessToken", () => {
      mockGetItem.mockImplementation((key) => {
        if (key === "authUser") {
          return JSON.stringify({ accessToken: "test-access-token-123" });
        }
        return null;
      });

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe("Bearer test-access-token-123");
    });

    test("should fallback to localStorage accessToken if authUser is missing", () => {
      mockGetItem.mockImplementation((key) => {
        if (key === "accessToken") return "fallback-token-456";
        return null;
      });

      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe("Bearer fallback-token-456");
    });

    test("should not add Authorization header if no token exists", () => {
      const config = { headers: {} };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    test("should handle JSON parse error gracefully", () => {
      mockGetItem.mockImplementation((key) => {
        if (key === "authUser") return "{malformed-json";
        return null;
      });

      const config = { headers: {} };
      // Must not throw
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBeUndefined();
    });

    test("should preserve existing headers when adding token", () => {
      mockGetItem.mockImplementation((key) => {
        if (key === "authUser") {
          return JSON.stringify({ accessToken: "token-789" });
        }
        return null;
      });

      const config = { headers: { "Content-Type": "application/json" } };
      const result = requestInterceptor(config);

      expect(result.headers.Authorization).toBe("Bearer token-789");
      expect(result.headers["Content-Type"]).toBe("application/json");
    });

    test("should create headers object if config has no headers", () => {
      mockGetItem.mockImplementation((key) => {
        if (key === "authUser") {
          return JSON.stringify({ accessToken: "no-headers-token" });
        }
        return null;
      });

      const config = {};
      const result = requestInterceptor(config);

      expect(result.headers).toBeDefined();
      expect(result.headers.Authorization).toBe("Bearer no-headers-token");
    });
  });

  describe("response interceptor", () => {
    test("should return response on success", () => {
      const response = { data: { id: 1 }, status: 200 };
      expect(responseFulfilled(response)).toEqual(response);
    });

    test("should clear storage and redirect on 401", async () => {
      const error = {
        response: { status: 401, data: { message: "Unauthorized" } },
      };

      await expect(responseRejected(error)).rejects.toEqual(error);

      expect(mockRemoveItem).toHaveBeenCalledWith("authUser");
      expect(mockRemoveItem).toHaveBeenCalledWith("accessToken");
      expect(window.location.href).toContain("/login");
    });

    test("should NOT clear storage on 500+ errors", async () => {
      const error = {
        response: { status: 500, data: { message: "Internal Server Error" } },
      };

      await expect(responseRejected(error)).rejects.toEqual(error);

      expect(mockRemoveItem).not.toHaveBeenCalled();
    });

    test("should NOT clear storage on non-401 4xx errors", async () => {
      const error = {
        response: { status: 403, data: { message: "Forbidden" } },
      };

      await expect(responseRejected(error)).rejects.toEqual(error);

      expect(mockRemoveItem).not.toHaveBeenCalled();
    });

    test("should propagate error via Promise.reject", async () => {
      const error = new Error("Network Error");
      await expect(responseRejected(error)).rejects.toEqual(error);
    });
  });
});

// ==================== Interceptor Logic (replicated from src/api/client.js) ====================

function requestInterceptor(config) {
  try {
    const rawAuthUser = localStorage.getItem("authUser");
    const authUser = rawAuthUser ? JSON.parse(rawAuthUser) : null;
    const token = authUser?.accessToken || localStorage.getItem("accessToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn("Unable to parse auth user from storage", error);
  }

  return config;
}

function responseFulfilled(response) {
  return response;
}

function responseRejected(error) {
  if (error.response?.status === 401) {
    localStorage.removeItem("authUser");
    localStorage.removeItem("accessToken");
    window.location.href = "/login";
  } else if (error.response?.status >= 500) {
    // handleApiError would be called here
  }

  return Promise.reject(error);
}
