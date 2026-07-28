import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import useConfirmDialog from "../../hooks/useConfirmDialog";

// Test component that uses the hook
function TestComponent({ dialogConfig }) {
  const { confirm, close, ConfirmDialog } = useConfirmDialog();

  return (
    <div>
      <button
        data-testid="open-btn"
        onClick={() => confirm(dialogConfig || {})}
      >
        Open Dialog
      </button>
      <button data-testid="close-btn" onClick={close}>
        Close Dialog
      </button>
      <ConfirmDialog />
    </div>
  );
}

describe("useConfirmDialog", () => {
  test("initial state: dialog should not be visible", () => {
    render(<TestComponent />);
    expect(screen.queryByText("Bạn có chắc chắn?")).not.toBeInTheDocument();
  });

  test("confirm() opens dialog with default config", () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId("open-btn"));
    expect(screen.getByText("Bạn có chắc chắn?")).toBeInTheDocument();
  });

  test("confirm() opens dialog with custom config", () => {
    const config = {
      title: "Xóa dữ liệu",
      content: "Bạn có chắc muốn xóa?",
      okText: "Xóa",
      cancelText: "Hủy bỏ",
    };
    render(<TestComponent dialogConfig={config} />);
    fireEvent.click(screen.getByTestId("open-btn"));

    expect(screen.getByText("Xóa dữ liệu")).toBeInTheDocument();
    expect(screen.getByText("Bạn có chắc muốn xóa?")).toBeInTheDocument();
    expect(screen.getByText("Xóa")).toBeInTheDocument();
    expect(screen.getByText("Hủy bỏ")).toBeInTheDocument();
  });

  test("close() closes the dialog", () => {
    render(<TestComponent />);
    fireEvent.click(screen.getByTestId("open-btn"));
    expect(screen.getByText("Bạn có chắc chắn?")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("close-btn"));
    expect(screen.queryByText("Bạn có chắc chắn?")).not.toBeInTheDocument();
  });

  test("onOk callback is executed when OK button clicked", () => {
    const onOk = jest.fn();
    const config = { content: "Bạn chắc chứ?", onOk };

    render(<TestComponent dialogConfig={config} />);
    fireEvent.click(screen.getByTestId("open-btn"));
    expect(screen.getByText("Bạn chắc chứ?")).toBeInTheDocument();

    // Use getAllByText and pick the button element
    const buttons = screen.getAllByText("Xác nhận");
    const okButton =
      buttons.find((el) => el.tagName === "BUTTON") ||
      buttons[buttons.length - 1];
    fireEvent.click(okButton);
    expect(onOk).toHaveBeenCalledTimes(1);
  });

  test("onCancel callback is executed when Cancel button clicked", () => {
    const onCancel = jest.fn();
    const config = { content: "Bạn chắc chứ?", onCancel };

    render(<TestComponent dialogConfig={config} />);
    fireEvent.click(screen.getByTestId("open-btn"));
    expect(screen.getByText("Bạn chắc chứ?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Hủy"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
