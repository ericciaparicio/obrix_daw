import { describe, it, expect, afterEach, vi } from "vitest";
import {
  getCurrentConstructorId,
  SEEDED_CONSTRUCTOR_ID,
} from "./current-constructor";

describe("getCurrentConstructorId", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("happy path", () => {
    it("should return the id of the constructor seeded by the seed script", () => {
      vi.stubEnv("NODE_ENV", "test");

      const id = getCurrentConstructorId();

      expect(id).toBe(SEEDED_CONSTRUCTOR_ID);
    });
  });

  describe("production guard", () => {
    it("should throw when NODE_ENV is production", () => {
      vi.stubEnv("NODE_ENV", "production");

      expect(() => getCurrentConstructorId()).toThrow();
    });
  });
});
