// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

jest.mock("@rc-component/pagination/locale/en_US", () => ({}), {
  virtual: true,
});
jest.mock("@rc-component/picker/locale/en_US", () => ({}), { virtual: true });
jest.mock("@rc-component/picker/generate/dayjs", () => ({}), { virtual: true });
