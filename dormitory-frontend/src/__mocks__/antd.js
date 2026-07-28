const React = require("react");

// Mock Descriptions component so StudentProfilePage can render
const Descriptions = (props) => {
  const children = React.Children.toArray(props.children || []);
  return React.createElement(
    "div",
    { className: "ant-descriptions" },
    React.createElement(
      "div",
      { className: "ant-descriptions-body" },
      children.map(function (child, i) {
        return React.createElement(
          "div",
          { key: i, className: "ant-descriptions-item" },
          child,
        );
      }),
    ),
  );
};
Descriptions.Item = (props) =>
  React.createElement(
    "div",
    { className: "ant-descriptions-item-content" },
    props.label
      ? React.createElement(
          "span",
          { className: "ant-descriptions-item-label" },
          props.label,
        )
      : null,
    React.createElement(
      "span",
      { className: "ant-descriptions-item-content" },
      props.children,
    ),
  );

const mockForm = {
  getFieldsValue: () => ({}),
  getFieldValue: () => null,
  setFieldsValue: () => {},
  resetFields: () => {},
  validateFields: () => Promise.resolve({}),
  submit: () => {},
  getFieldError: () => [],
  isFieldTouched: () => false,
  isFieldsTouched: () => false,
  isFieldValidating: () => false,
  scrollToField: () => {},
  getFieldInstance: () => null,
};

const mockModalAssign = {
  confirm: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  useModal: () => [{ confirm: jest.fn(), info: jest.fn() }, null],
};

const Div = (props) => React.createElement("div", null, props.children);
const EmptyFn = (props) => null;

const MockTable = ({ columns, dataSource, loading }) => {
  if (loading) return null;
  const rows = (dataSource || []).map(function (row, ri) {
    const cells = (columns || []).map(function (c, ci) {
      var val = c.render
        ? c.render(row[c.dataIndex], row, ri)
        : String(row[c.dataIndex] || "");
      return React.createElement("td", { key: ci }, val);
    });
    return React.createElement("tr", { key: row.id || ri }, cells);
  });
  const headers = (columns || []).map(function (c, i) {
    return React.createElement("th", { key: i }, c.title);
  });
  return React.createElement(
    "table",
    { className: "mock-table" },
    React.createElement(
      "thead",
      null,
      React.createElement("tr", null, headers),
    ),
    React.createElement("tbody", null, rows),
  );
};

// Global object to track form input values
// Global object to track form input values
var formValues = {};

// Helper to collect all input values from form children
function collectFormValues(children) {
  var vals = {};
  React.Children.forEach(children, function (child) {
    if (child && child.props) {
      var name = child.props.name;
      if (child.props && child.props.value !== undefined && name) {
        vals[name] = child.props.value;
      }
      if (child.props && child.props.children) {
        var childArr = Array.isArray(child.props.children)
          ? child.props.children
          : [child.props.children];
        childArr.forEach(function (sub) {
          if (
            sub &&
            sub.props &&
            sub.props.value !== undefined &&
            sub.props.name
          ) {
            vals[sub.props.name] = sub.props.value;
          }
        });
      }
    }
  });
  return vals;
}

// Define Input BEFORE module.exports so Form.Item can reference it
var Input = Object.assign(
  (props) => {
    return React.createElement("input", {
      placeholder: props.placeholder || "",
      value: props.value || "",
      onChange: function (e) {
        props.onChange && props.onChange(e);
      },
    });
  },
  {
    Password: (props) =>
      React.createElement("input", {
        type: "password",
        placeholder: props.placeholder || "Mật khẩu",
        value: props.value || "",
        onChange: function (e) {
          props.onChange && props.onChange(e);
        },
      }),
  },
);

module.exports = {
  ConfigProvider: (props) =>
    React.createElement(React.Fragment, null, props.children),
  App: (props) => React.createElement(React.Fragment, null, props.children),
  Spin: (props) =>
    props.children ? React.createElement("div", null, props.children) : null,
  Card: (props) =>
    React.createElement(
      "div",
      {
        className: "ant-card",
        onClick: props.onClick,
        "data-hoverable": props.hoverable ? "true" : undefined,
      },
      props.title
        ? React.createElement(
            "div",
            { className: "ant-card-head" },
            props.title,
          )
        : null,
      props.extra,
      React.createElement(
        "div",
        { className: "ant-card-body" },
        props.children,
      ),
    ),
  Button: (props) =>
    React.createElement(
      "button",
      {
        onClick: props.onClick,
        disabled: !!(props.disabled || props.loading),
        "data-danger": props.danger ? "true" : undefined,
        "data-type": props.type || "default",
      },
      props.icon,
      props.children,
    ),
  Table: MockTable,
  Tag: (props) => React.createElement("span", null, props.children),
  Space: Div,
  Tooltip: Div,
  Row: Div,
  Col: Div,
  Typography: {
    Title: (props) => React.createElement("h4", null, props.children),
    Text: (props) => React.createElement("span", null, props.children),
    Paragraph: (props) => React.createElement("p", null, props.children),
  },
  Modal: Object.assign((props) => {
    if (!props.open) return null;
    return React.createElement(
      "div",
      { className: "ant-modal" },
      React.createElement(
        "div",
        { className: "ant-modal-header" },
        props.title,
      ),
      React.createElement(
        "div",
        { className: "ant-modal-body" },
        props.children,
      ),
      React.createElement(
        "div",
        { className: "ant-modal-footer" },
        React.createElement(
          "button",
          {
            onClick: function () {
              props.onCancel && props.onCancel();
            },
          },
          props.cancelText || "Hủy",
        ),
        React.createElement(
          "button",
          {
            onClick: function () {
              props.onOk && props.onOk();
            },
          },
          props.okText || "Xác nhận",
        ),
      ),
    );
  }, mockModalAssign),
  Form: Object.assign(
    (props) =>
      React.createElement(
        "form",
        {
          onSubmit: function (e) {
            if (e && e.preventDefault) e.preventDefault();
            if (props.onFinish) {
              var collected = collectFormValues(props.children);
              var finalData = Object.assign({}, formValues, collected);
              props.onFinish(finalData);
            }
          },
        },
        props.children,
      ),
    {
      Item: (props) => {
        var name = props.name;
        var child = props.children;
        if (child && child.type === Input && name) {
          return React.createElement(
            "div",
            null,
            props.label
              ? React.createElement("label", null, props.label)
              : null,
            React.cloneElement(child, {
              "data-form-name": name,
              onChange: function (e) {
                formValues[name] = e.target ? e.target.value : e;
                if (child.props.onChange) child.props.onChange(e);
              },
            }),
          );
        }
        if (child && child.type && child.type === Input.Password && name) {
          return React.createElement(
            "div",
            null,
            props.label
              ? React.createElement("label", null, props.label)
              : null,
            React.cloneElement(child, {
              "data-form-name": name,
              onChange: function (e) {
                formValues[name] = e.target ? e.target.value : e;
                if (child.props.onChange) child.props.onChange(e);
              },
            }),
          );
        }
        return React.createElement(
          "div",
          null,
          props.label ? React.createElement("label", null, props.label) : null,
          child,
        );
      },
      useForm: () => [mockForm, null],
      useWatch: () => ({}),
      List: Div,
      Provider: (props) =>
        React.createElement(React.Fragment, null, props.children),
    },
  ),
  Input: Input,
  InputNumber: (props) =>
    React.createElement("input", {
      type: "number",
      placeholder: props.placeholder || "",
      value: props.value ?? "",
      onChange: function (e) {
        props.onChange && props.onChange(Number(e.target.value));
      },
      min: props.min,
      max: props.max,
    }),
  Select: Object.assign(
    (props) =>
      React.createElement(
        "select",
        {
          value: props.value ?? "",
          onChange: function (e) {
            props.onChange && props.onChange(e.target.value || undefined);
          },
          disabled: !!props.disabled,
        },
        props.placeholder
          ? React.createElement("option", { value: "" }, props.placeholder)
          : null,
        props.children,
      ),
    {
      Option: (props) =>
        React.createElement(
          "option",
          { value: String(props.value ?? "") },
          props.children,
        ),
    },
  ),
  Option: (props) =>
    React.createElement(
      "option",
      { value: String(props.value ?? "") },
      props.children,
    ),
  DatePicker: (props) =>
    React.createElement("input", {
      type: "date",
      value: props.value || "",
      onChange: function (e) {
        props.onChange && props.onChange(e.target.value);
      },
    }),
  Switch: (props) =>
    React.createElement("input", {
      type: "checkbox",
      checked: !!props.checked,
      onChange: function (e) {
        props.onChange && props.onChange(e.target.checked);
      },
    }),
  Checkbox: (props) =>
    React.createElement(
      "label",
      null,
      React.createElement("input", {
        type: "checkbox",
        checked: !!props.checked,
        onChange: function (e) {
          props.onChange && props.onChange(e.target.checked);
        },
      }),
      props.children,
    ),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    loading: jest.fn(),
    destroy: jest.fn(),
  },
  notification: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    open: jest.fn(),
    destroy: jest.fn(),
  },
  Empty: (props) =>
    React.createElement(
      "div",
      { className: "ant-empty" },
      props.description || "Không có dữ liệu",
    ),
  Alert: (props) =>
    React.createElement(
      "div",
      { className: "ant-alert ant-alert-" + (props.type || "info") },
      props.message,
      props.description
        ? React.createElement("div", null, props.description)
        : null,
    ),
  Statistic: (props) =>
    React.createElement(
      "div",
      null,
      props.title ? React.createElement("div", null, props.title) : null,
      React.createElement(
        "div",
        null,
        (props.value ?? "") + " " + (props.suffix || ""),
      ),
    ),
  Badge: (props) =>
    React.createElement(
      "div",
      null,
      props.children,
      React.createElement("sup", null, String(props.count ?? "")),
    ),
  Popconfirm: (props) =>
    React.createElement(
      "div",
      { onClick: props.onConfirm || function () {} },
      props.children,
    ),
  Popover: Div,
  Dropdown: Div,
  Menu: (props) =>
    React.createElement(
      "div",
      null,
      (props.items || []).map(function (item, i) {
        return React.createElement(
          "div",
          {
            key: item.key || i,
            onClick: function () {
              props.onClick && props.onClick({ key: item.key });
            },
          },
          item.label || item.title,
        );
      }),
    ),
  MenuItem: Div,
  Avatar: (props) => React.createElement("div", null, props.icon || props.src),
  Tabs: (props) =>
    React.createElement(
      "div",
      null,
      (props.items || []).map(function (item, i) {
        return React.createElement(
          "div",
          {
            key: item.key || i,
            onClick: function () {
              props.onChange && props.onChange(item.key);
            },
          },
          item.label,
        );
      }),
    ),
  Breadcrumb: (props) =>
    React.createElement(
      "div",
      null,
      (props.items || []).map(function (item, i) {
        return React.createElement(
          "span",
          { key: i },
          item.title || item.breadcrumbName,
        );
      }),
    ),
  Skeleton: (props) =>
    props.children ? React.createElement("div", null, props.children) : null,
  Drawer: (props) =>
    props.open
      ? React.createElement(
          "div",
          null,
          props.title ? React.createElement("div", null, props.title) : null,
          props.children,
        )
      : null,
  Result: (props) =>
    React.createElement(
      "div",
      null,
      React.createElement("div", null, props.title || "Result"),
      props.subTitle ? React.createElement("div", null, props.subTitle) : null,
      props.extra,
      props.children,
    ),
  Progress: (props) =>
    React.createElement(
      "div",
      null,
      (props.type || "line") + ": " + (props.percent ?? 0) + "%",
    ),
  Rate: (props) =>
    React.createElement("div", null, "Rate: " + (props.value ?? 0)),
  Slider: (props) =>
    React.createElement("input", {
      type: "range",
      value: props.value ?? 0,
      onChange: function (e) {
        props.onChange && props.onChange(Number(e.target.value));
      },
      min: props.min ?? 0,
      max: props.max ?? 100,
    }),
  Upload: Div,
  Collapse: (props) =>
    React.createElement(
      "div",
      null,
      (props.items || []).map(function (item, i) {
        return React.createElement(
          "div",
          { key: item.key || i },
          item.label,
          item.children,
        );
      }),
    ),
  CollapsePanel: Div,
  Timeline: (props) =>
    React.createElement(
      "div",
      null,
      (props.items || []).map(function (item, i) {
        return React.createElement(
          "div",
          { key: i },
          item.children || item.label || "",
        );
      }),
    ),
  TimelineItem: Div,
  Tree: (props) =>
    React.createElement(
      "div",
      null,
      (props.treeData || []).map(function (node, i) {
        return React.createElement(
          "div",
          {
            key: node.key || i,
            onClick: function () {
              props.onSelect && props.onSelect([node.key]);
            },
          },
          node.title,
        );
      }),
    ),
  Descriptions: Descriptions,
};
