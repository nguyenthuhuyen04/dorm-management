import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EmptyState from "../../../components/common/EmptyState";

describe("EmptyState", () => {
  test("renders with default description", () => {
    render(<EmptyState />);
    expect(screen.getByText("Không có dữ liệu")).toBeInTheDocument();
  });

  test("renders with custom description", () => {
    render(<EmptyState description="Không có sinh viên nào" />);
    expect(screen.getByText("Không có sinh viên nào")).toBeInTheDocument();
  });

  test("renders action button when actionText and onAction provided", () => {
    const onAction = jest.fn();
    render(
      <EmptyState
        description="Danh sách trống"
        actionText="Thêm mới"
        onAction={onAction}
      />,
    );
    const button = screen.getByText("Thêm mới");
    expect(button).toBeInTheDocument();
  });

  test("does not render button when actionText is missing", () => {
    render(<EmptyState />);
    // No button should be rendered
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });

  test("does not render button when onAction is missing", () => {
    render(<EmptyState description="Trống" actionText="Thêm" />);
    const buttons = screen.queryAllByRole("button");
    expect(buttons).toHaveLength(0);
  });

  test("action button triggers onAction callback", () => {
    const onAction = jest.fn();
    render(
      <EmptyState description="Trống" actionText="Thêm" onAction={onAction} />,
    );
    fireEvent.click(screen.getByText("Thêm"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  test("renders custom icon", () => {
    const { container } = render(
      <EmptyState icon={<span data-testid="custom-icon">🔍</span>} />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });
});
