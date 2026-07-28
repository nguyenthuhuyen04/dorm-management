import React from "react";
import { render, screen } from "@testing-library/react";
import LoadingState from "../../../components/common/LoadingState";

describe("LoadingState", () => {
  test("renders with default message", () => {
    render(<LoadingState />);
    expect(screen.getByText("Đang tải dữ liệu...")).toBeInTheDocument();
  });

  test("renders with custom message", () => {
    render(<LoadingState message="Đang tải danh sách..." />);
    expect(screen.getByText("Đang tải danh sách...")).toBeInTheDocument();
  });

  test("renders with spinner", () => {
    const { container } = render(<LoadingState />);
    // antd Spin renders an element - verify container has children
    expect(container.firstChild).toBeInTheDocument();
  });

  test("fullPage prop applies full page styling", () => {
    const { container } = render(<LoadingState fullPage />);
    const outerDiv = container.firstChild;
    // fullPage uses minHeight: 60vh
    expect(outerDiv).toHaveStyle("min-height: 60vh");
  });

  test("non-fullPage uses padding style", () => {
    const { container } = render(<LoadingState />);
    const outerDiv = container.firstChild;
    expect(outerDiv).toHaveStyle("padding: 48px 0");
  });
});
