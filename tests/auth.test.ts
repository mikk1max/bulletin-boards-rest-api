import bcrypt from "bcrypt";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  refreshToken: { deleteMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("../prisma/client.ts", () => ({ default: prismaMock }));

const { default: app } = await import("../app.ts");
const { generateTokens, verifyToken } = await import("../src/utils/tokens.ts");

const newUser = {
  username: "ivan_petrenko",
  email: "ivan@example.com",
  password: "secret123",
  name: "Ivan",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockResolvedValue([]);
});

describe("tokens", () => {
  it("generates an access and refresh token pair for the user", () => {
    const { accessToken, refreshToken } = generateTokens({ id: 1, username: "ivan_petrenko" });

    expect(verifyToken(accessToken, "access")).toMatchObject({ sub: "1", username: "ivan_petrenko" });
    expect(verifyToken(refreshToken, "refresh")).toMatchObject({ sub: "1" });
  });

  it("rejects a refresh token used as an access token", () => {
    const { refreshToken } = generateTokens({ id: 1, username: "ivan_petrenko" });

    expect(() => verifyToken(refreshToken, "access")).toThrow();
  });
});

describe("password hashing", () => {
  it("stores a bcrypt hash that matches only the original password", async () => {
    const hash = await bcrypt.hash("secret123", 10);

    expect(hash).not.toBe("secret123");
    expect(await bcrypt.compare("secret123", hash)).toBe(true);
    expect(await bcrypt.compare("wrong-password", hash)).toBe(false);
  });
});

describe("POST /auth/register", () => {
  it("returns 201 with the user and a token pair for valid data", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 1, username: "ivan_petrenko", email: "ivan@example.com", name: "Ivan" });

    const res = await request(app).post("/auth/register").send(newUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: 1, username: "ivan_petrenko", email: "ivan@example.com", name: "Ivan" });
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.refreshToken).toEqual(expect.any(String));

    const savedPassword = prismaMock.user.create.mock.calls[0][0].data.password;
    expect(await bcrypt.compare(newUser.password, savedPassword)).toBe(true);
    expect(prismaMock.refreshToken.create).toHaveBeenCalledWith({
      data: { token: res.body.refreshToken, userId: 1 },
    });
  });

  it("returns 409 when the username or email is already taken", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 1 });

    const res = await request(app).post("/auth/register").send(newUser);

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "Username or email already taken" });
  });

  it("returns 400 with validation details for invalid data", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ username: "iv", email: "not-an-email", password: "1", name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details.body).toHaveLength(4);
  });
});

describe("POST /auth/login", () => {
  it("returns 401 for a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 1,
      username: "ivan_petrenko",
      password: await bcrypt.hash("secret123", 10),
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ username: "ivan_petrenko", password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });

  it("returns the same 401 message for an unknown username", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post("/auth/login")
      .send({ username: "nobody", password: "secret123" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Invalid credentials" });
  });
});
