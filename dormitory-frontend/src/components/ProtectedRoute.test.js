import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

beforeEach(() => {
  localStorage.clear();
});

test("redirects student away from admin route", () => {
  localStorage.setItem(
    "authUser",
    JSON.stringify({ role: "STUDENT", username: "student01" }),
  );

  render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <div>Admin page</div>
            </ProtectedRoute>
          }
        />
        <Route path="/student/dashboard" element={<div>Student page</div>} />
      </Routes>
    </MemoryRouter>,
  );

  expect(screen.queryByText("Admin page")).not.toBeInTheDocument();
  expect(screen.getByText("Student page")).toBeInTheDocument();
});
