import { render, screen } from "@testing-library/react";
import App from "./App";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  RouterProvider: ({ router }) => (
    <div data-testid="mock-router">{router?.path || "Login screen"}</div>
  ),
}));

// Mock routes
jest.mock("./routes", () => ({
  __esModule: true,
  default: { path: "/login" },
}));

// App.js imports "antd/dist/reset.css" which is already mocked in setupTests.js

test("renders login route provider", () => {
  render(<App />);
  expect(screen.getByTestId("mock-router")).toBeInTheDocument();
});
