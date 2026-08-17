// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ObraPage from "./page";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockClear();
  vi.stubGlobal("fetch", vi.fn());
});

// See the same note in ObraForm.test.tsx: `test.globals` is off, so RTL's auto-cleanup needs to
// be registered explicitly.
afterEach(cleanup);

describe("ObraPage (landing /obra)", () => {
  it("redirige a /obra/nueva cuando GET /api/obras/actual da 404", async () => {
    vi.mocked(fetch).mockResolvedValue({
      status: 404,
      ok: false,
      json: async () => ({ error: "sin_obra" }),
    } as Response);

    render(<ObraPage />);

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/obra/nueva"));
    expect(fetch).toHaveBeenCalledWith("/api/obras/actual");
  });
});
