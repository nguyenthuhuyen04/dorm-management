import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("react-router-dom", () => ({
  RouterProvider: ({ router }) => <div>{router?.path || "Login screen"}</div>,
}));

jest.mock("./routes", () => ({
  __esModule: true,
  default: { path: "/login" },
}));

test("renders login route provider", () => {
  render(<App />);
  expect(screen.getByText(/\/login/i)).toBeInTheDocument();
});
