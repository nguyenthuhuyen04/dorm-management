// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Mock CSS imports to prevent Jest from failing on CSS file imports
jest.mock("antd/dist/reset.css", () => ({}), { virtual: true });

// Mock antd globally using the manual mock in __mocks__/antd.js
jest.mock("antd");

// Mock @ant-design/icons to prevent import errors
jest.mock(
  "@ant-design/icons",
  () => {
    const React = require("react");
    const MockIcon = (props) =>
      React.createElement(
        "span",
        { "data-testid": "mock-icon" },
        props.children,
      );
    return {
      UserOutlined: MockIcon,
      LockOutlined: MockIcon,
      HomeOutlined: MockIcon,
      PlusOutlined: MockIcon,
      EditOutlined: MockIcon,
      DeleteOutlined: MockIcon,
      SearchOutlined: MockIcon,
      ReloadOutlined: MockIcon,
      IdcardOutlined: MockIcon,
      MailOutlined: MockIcon,
      PhoneOutlined: MockIcon,
      TeamOutlined: MockIcon,
      BuildingOutlined: MockIcon,
      DashboardOutlined: MockIcon,
      SettingOutlined: MockIcon,
      LogoutOutlined: MockIcon,
      MenuOutlined: MockIcon,
      BellOutlined: MockIcon,
      EyeOutlined: MockIcon,
      DownloadOutlined: MockIcon,
      UploadOutlined: MockIcon,
      CheckOutlined: MockIcon,
      CloseOutlined: MockIcon,
      ArrowLeftOutlined: MockIcon,
      ArrowRightOutlined: MockIcon,
      LeftOutlined: MockIcon,
      RightOutlined: MockIcon,
      InfoCircleOutlined: MockIcon,
      ExclamationCircleOutlined: MockIcon,
      WarningOutlined: MockIcon,
      LoadingOutlined: MockIcon,
      EllipsisOutlined: MockIcon,
      FileTextOutlined: MockIcon,
      SafetyOutlined: MockIcon,
      ApartmentOutlined: MockIcon,
      KeyOutlined: MockIcon,
      AppstoreOutlined: MockIcon,
      CreditCardOutlined: MockIcon,
      CustomerServiceOutlined: MockIcon,
      CheckCircleOutlined: MockIcon,
      default: MockIcon,
    };
  },
  { virtual: true },
);

jest.mock("@rc-component/pagination/locale/en_US", () => ({}), {
  virtual: true,
});
jest.mock("@rc-component/picker/locale/en_US", () => ({}), { virtual: true });
jest.mock("@rc-component/picker/generate/dayjs", () => ({}), { virtual: true });
