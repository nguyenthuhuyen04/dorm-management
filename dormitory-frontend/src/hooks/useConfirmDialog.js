import React, { useState, useCallback, useMemo } from "react";
import ConfirmDialog from "../components/common/ConfirmDialog";

/**
 * Hook quản lý Confirm dialog state
 *
 * @returns {{ confirm: function, close: function, ConfirmDialog: React.Component }}
 *
 * Usage:
 *   const { confirm, close, ConfirmDialog } = useConfirmDialog();
 *   ...
 *   confirm({
 *     title: "Xóa hợp đồng?",
 *     content: "Bạn có chắc chắn muốn xóa?",
 *     danger: true,
 *     onOk: () => handleDelete(id),
 *   });
 *   ...
 *   <ConfirmDialog />
 */
function useConfirmDialog() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState({
    title: "Xác nhận",
    content: "Bạn có chắc chắn?",
    okText: "Xác nhận",
    cancelText: "Hủy",
    danger: false,
    loading: false,
    onOk: () => {},
    onCancel: () => {},
    okButtonProps: {},
  });

  const confirm = useCallback((dialogConfig = {}) => {
    setConfig((prev) => ({
      ...prev,
      ...dialogConfig,
      onOk: async () => {
        if (dialogConfig.onOk) {
          try {
            await dialogConfig.onOk();
          } finally {
            setVisible(false);
          }
        } else {
          setVisible(false);
        }
      },
      onCancel: () => {
        if (dialogConfig.onCancel) {
          dialogConfig.onCancel();
        }
        setVisible(false);
      },
    }));
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const DialogComponent = useMemo(() => {
    return function DialogWrapper() {
      return (
        <ConfirmDialog
          visible={visible}
          title={config.title}
          content={config.content}
          okText={config.okText}
          cancelText={config.cancelText}
          danger={config.danger}
          loading={config.loading}
          okButtonProps={config.okButtonProps}
          onOk={config.onOk}
          onCancel={config.onCancel}
        />
      );
    };
  }, [visible, config]);

  return { confirm, close, ConfirmDialog: DialogComponent };
}

export default useConfirmDialog;
