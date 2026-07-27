import { message } from "antd";

/**
 * Global toast service
 * Sử dụng antd message (phân tán - không cần context)
 */

// Cấu hình thời gian hiển thị
const DURATION = 3;
const LONG_DURATION = 5;

/**
 * Hiển thị toast lỗi (màu đỏ)
 */
export const showError = (msg, duration = DURATION) => {
  message.error(msg, duration);
};

/**
 * Hiển thị toast thành công (màu xanh)
 */
export const showSuccess = (msg, duration = DURATION) => {
  message.success(msg, duration);
};

/**
 * Hiển thị toast cảnh báo (màu vàng)
 */
export const showWarning = (msg, duration = DURATION) => {
  message.warning(msg, duration);
};

/**
 * Hiển thị toast thông tin (màu xanh dương)
 */
export const showInfo = (msg, duration = DURATION) => {
  message.info(msg, duration);
};

/**
 * Xử lý lỗi từ API response
 * Tự động trích xuất message từ error.response.data.message
 * Hỗ trợ cả string và array message
 *
 * @param {Error} error - Axios error object
 * @param {string} fallback - Fallback message nếu không có response
 */
export const handleApiError = (
  error,
  fallback = "Kết nối thất bại, vui lòng thử lại",
) => {
  if (!error) {
    showError(fallback);
    return;
  }

  const status = error.response?.status;
  const data = error.response?.data;
  let errorMsg = fallback;

  if (data) {
    if (typeof data.message === "string") {
      errorMsg = data.message;
    } else if (Array.isArray(data.message) && data.message.length > 0) {
      // Lấy lỗi đầu tiên từ mảng (validation errors từ NestJS)
      errorMsg = data.message[0];
    } else if (data.error) {
      errorMsg = data.error;
    }
  }

  // Map status code to Vietnamese messages
  if (status === 403) {
    errorMsg = "Bạn không có quyền thực hiện hành động này";
  } else if (status === 404) {
    errorMsg = "Không tìm thấy dữ liệu yêu cầu";
  } else if (status === 409) {
    errorMsg = errorMsg || "Dữ liệu đã tồn tại hoặc xung đột";
  } else if (status >= 500) {
    errorMsg = "Lỗi máy chủ, vui lòng thử lại sau";
  }

  showError(errorMsg, LONG_DURATION);
};

/**
 * Hiển thị từng lỗi validation từ backend (array message)
 *
 * @param {Error} error - Axios error object
 */
export const showValidationErrors = (error) => {
  const messages = error?.response?.data?.message;

  if (Array.isArray(messages)) {
    // Hiển thị tối đa 3 lỗi để tránh spam
    const maxShow = Math.min(messages.length, 3);
    for (let i = 0; i < maxShow; i++) {
      showError(messages[i], LONG_DURATION);
    }
    if (messages.length > maxShow) {
      showWarning(`Còn ${messages.length - maxShow} lỗi khác`, LONG_DURATION);
    }
  } else if (typeof messages === "string") {
    showError(messages, LONG_DURATION);
  } else {
    handleApiError(error);
  }
};

const toast = {
  showError,
  showSuccess,
  showWarning,
  showInfo,
  handleApiError,
  showValidationErrors,
};

export default toast;
