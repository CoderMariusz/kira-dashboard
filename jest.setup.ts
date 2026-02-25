import '@testing-library/jest-dom';
import 'whatwg-fetch';

type MockServer = {
  listen: () => void;
  resetHandlers: () => void;
  close: () => void;
};

const noop = () => {};
let server: MockServer = {
  listen: noop,
  resetHandlers: noop,
  close: noop,
};

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  server = require('@/__tests__/mocks/server').server as MockServer;
} catch {
  // MSW import can be unavailable in minimal smoke setup.
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
