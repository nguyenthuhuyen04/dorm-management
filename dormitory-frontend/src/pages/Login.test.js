import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./Login";
import { login } from "../services/authService";

jest.mock("../services/authService", () => ({
  login: jest.fn(),
}));

jest.mock("../utils/toast", () => ({
  showSuccess: jest.fn(),
  handleApiError: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

describe("Login", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("stores the access token after a successful login", async () => {
    login.mockResolvedValue({
      data: {
        accessToken: "test-token",
        user: { id: 1, username: "admin_test", role: "ADMIN" },
      },
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(
      screen.getByPlaceholderText(/nhập email hoặc tên đăng nhập/i),
      {
        target: { value: "admin_test" },
      },
    );
    fireEvent.change(screen.getByPlaceholderText("Mật khẩu"), {
      target: { value: "AdminTest123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

    await waitFor(() => {
      expect(localStorage.getItem("accessToken")).toBe("test-token");
    });
  });
});
