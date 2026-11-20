import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { endSession, useSession } from "~/api/session";

import { server } from "./server";

beforeAll(() => {
  // a request without a handler is a test bug, never a real call to the backend
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  endSession();
  useSession.setState({ status: "unknown" });
});

afterAll(() => {
  server.close();
});
