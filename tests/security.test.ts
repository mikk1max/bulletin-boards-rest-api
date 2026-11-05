import request from "supertest";
import { describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn().mockResolvedValue(null) },
  announcement: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
}));

vi.mock("../prisma/client.ts", () => ({ default: prismaMock }));

const { default: app } = await import("../app.ts");

describe("helmet", () => {
  it("sets secure HTTP headers", async () => {
    const res = await request(app).get("/announcements");

    expect(res.headers["content-security-policy"]).toBeDefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS", () => {
  it("allows origins listed in ALLOWED_ORIGINS", async () => {
    const res = await request(app).get("/announcements").set("Origin", "http://localhost:5173");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("rejects other origins with 403", async () => {
    const res = await request(app).get("/announcements").set("Origin", "http://evil.example");

    expect(res.status).toBe(403);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("returns 429 after 10 auth requests from the same IP", async () => {
    const login = () => request(app).post("/auth/login").send({ username: "nobody", password: "secret123" });

    for (let i = 0; i < 10; i++) {
      expect((await login()).status).toBe(401);
    }

    const res = await login();
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "Too many requests, please try again later" });
  });

  it("does not limit non-auth routes", async () => {
    for (let i = 0; i < 11; i++) {
      expect((await request(app).get("/announcements")).status).toBe(200);
    }
  });
});
