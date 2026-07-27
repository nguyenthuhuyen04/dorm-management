import { render, screen } from "@testing-library/react";
import StudentsPage from "./StudentsPage";
import { studentService, userService } from "../../services";

jest.mock("antd", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
  Card: ({ children }) => <div>{children}</div>,
  Col: ({ children }) => <div>{children}</div>,
  Form: Object.assign(({ children }) => <div>{children}</div>, {
    useForm: () => [{ setFieldsValue: jest.fn(), resetFields: jest.fn() }],
  }),
  Input: ({ children, ...props }) => <input {...props}>{children}</input>,
  Modal: ({ children, open }) => (open ? <div>{children}</div> : null),
  Row: ({ children }) => <div>{children}</div>,
  Select: Object.assign(
    ({ children, ...props }) => <div {...props}>{children}</div>,
    {
      Option: ({ children, ...props }) => <div {...props}>{children}</div>,
    },
  ),
  Space: ({ children }) => <div>{children}</div>,
  Table: () => <div />,
  Tag: ({ children }) => <span>{children}</span>,
  Tooltip: ({ children }) => <div>{children}</div>,
  Typography: {
    Title: ({ children }) => <h1>{children}</h1>,
    Text: ({ children }) => <span>{children}</span>,
  },
  DatePicker: ({ children }) => <div>{children}</div>,
}));

jest.mock("@ant-design/icons", () => ({
  DeleteOutlined: () => <span />,
  EditOutlined: () => <span />,
  PlusOutlined: () => <span />,
  ReloadOutlined: () => <span />,
  SearchOutlined: () => <span />,
  UserOutlined: () => <span />,
}));

jest.mock("../../components/common/LoadingState", () => () => (
  <div>Loading</div>
));
jest.mock("../../components/common/EmptyState", () => () => <div>Empty</div>);
jest.mock("../../components/common/RetryError", () => () => <div>Retry</div>);

jest.mock("../../services", () => ({
  studentService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  userService: {
    getAll: jest.fn(),
  },
}));

jest.mock("../../utils/toast", () => ({
  showSuccess: jest.fn(),
  handleApiError: jest.fn(),
}));

jest.mock("../../hooks/useConfirmDialog", () => ({
  __esModule: true,
  default: () => ({
    confirm: jest.fn(),
    ConfirmDialog: () => null,
  }),
}));

describe("StudentsPage", () => {
  beforeEach(() => {
    studentService.getAll.mockResolvedValue({
      data: { data: [], page: 1, limit: 10, total: 0 },
    });
    userService.getAll.mockResolvedValue({ data: { data: [] } });
  });

  it("renders the student management page", async () => {
    render(<StudentsPage />);

    expect(await screen.findByText(/Quản lý sinh viên/i)).toBeInTheDocument();
  });
});
