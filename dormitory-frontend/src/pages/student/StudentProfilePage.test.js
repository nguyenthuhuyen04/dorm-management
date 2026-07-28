import React from "react";
import { render, waitFor } from "@testing-library/react";
import StudentProfilePage from "./StudentProfilePage";
import * as authService from "../../services/authService";
import * as studentService from "../../services/studentService";

jest.mock("../../services/authService", () => ({
  getProfile: jest.fn(),
}));

jest.mock("../../services/studentService", () => ({
  getAll: jest.fn(),
}));

// Ensure antd manual mock is used (setupTests.js has global mock)
// StudentProfilePage uses Descriptions.Item which needs the mock

describe("StudentProfilePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Set initial authUser in localStorage for the component to read
    localStorage.setItem(
      "authUser",
      JSON.stringify({ id: 2, username: "student01", role: "STUDENT" }),
    );
  });

  it("persists the fetched profile into auth user storage", async () => {
    authService.getProfile.mockResolvedValue({
      data: {
        id: 2,
        username: "student01",
        fullName: "Nguyễn Văn An",
        role: "STUDENT",
      },
    });
    studentService.getAll.mockResolvedValue({ data: { data: [] } });

    render(<StudentProfilePage />);

    await waitFor(() => expect(authService.getProfile).toHaveBeenCalled());

    await waitFor(() => {
      const storedUser = JSON.parse(localStorage.getItem("authUser") || "{}");
      expect(storedUser.fullName).toBe("Nguyễn Văn An");
    });
  });
});
