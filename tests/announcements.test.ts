import { existsSync } from "node:fs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, cloudinaryUpload } = vi.hoisted(() => ({
  prismaMock: {
    announcement: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  },
  cloudinaryUpload: vi.fn(),
}));

vi.mock("../prisma/client.ts", () => ({ default: prismaMock }));
vi.mock("cloudinary", () => ({
  v2: { config: vi.fn(), uploader: { upload: cloudinaryUpload } },
}));

const { default: app } = await import("../app.ts");
const { generateTokens } = await import("../src/utils/tokens.ts");

const IMAGE_URL = "https://res.cloudinary.com/demo/image/upload/v1/announcements/abc123.jpg";
const PNG = Buffer.from("89504e470d0a1a0a", "hex");
const { accessToken } = generateTokens({ id: 1, username: "ivan_petrenko" });

const fields = {
  title: "Selling a bicycle",
  description: "Trek in great condition, frame size L",
  price: "8500",
  category: "sale",
};

function postAnnouncement() {
  const req = request(app).post("/announcements").set("Authorization", `Bearer ${accessToken}`);
  for (const [key, value] of Object.entries(fields)) req.field(key, value);
  return req;
}

beforeEach(() => {
  vi.clearAllMocks();
  cloudinaryUpload.mockResolvedValue({ secure_url: IMAGE_URL });
  prismaMock.announcement.create.mockImplementation(({ data }) => ({ id: 1, ...data }));
});

describe("POST /announcements", () => {
  it("returns 401 without an access token", async () => {
    const res = await request(app).post("/announcements").send(fields);

    expect(res.status).toBe(401);
  });

  it("uploads the image to Cloudinary, stores its URL and removes the temp file", async () => {
    const res = await postAnnouncement().attach("image", PNG, {
      filename: "bike.png",
      contentType: "image/png",
    });

    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toBe(IMAGE_URL);

    const [tempPath] = cloudinaryUpload.mock.calls[0];
    expect(tempPath).toMatch(/^uploads\//);
    expect(existsSync(tempPath)).toBe(false);
    expect(prismaMock.announcement.create.mock.calls[0][0].data).toMatchObject({
      price: 8500,
      imageUrl: IMAGE_URL,
      userId: 1,
    });
  });

  it("returns 502 and removes the temp file when Cloudinary fails", async () => {
    cloudinaryUpload.mockRejectedValue(new Error("Invalid API key"));

    const res = await postAnnouncement().attach("image", PNG, {
      filename: "bike.png",
      contentType: "image/png",
    });

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: "Image upload failed" });

    const [tempPath] = cloudinaryUpload.mock.calls[0];
    expect(existsSync(tempPath)).toBe(false);
    expect(prismaMock.announcement.create).not.toHaveBeenCalled();
  });

  it("creates an announcement without an image", async () => {
    const res = await postAnnouncement();

    expect(res.status).toBe(201);
    expect(cloudinaryUpload).not.toHaveBeenCalled();
    expect(prismaMock.announcement.create.mock.calls[0][0].data.imageUrl).toBeUndefined();
  });

  it("rejects non-image files with 400", async () => {
    const res = await postAnnouncement().attach("image", Buffer.from("hello"), {
      filename: "note.txt",
      contentType: "text/plain",
    });

    expect(res.status).toBe(400);
    expect(cloudinaryUpload).not.toHaveBeenCalled();
  });
});

describe("PATCH /announcements/:id", () => {
  it("returns 403 when updating someone else's announcement", async () => {
    prismaMock.announcement.findUnique.mockResolvedValue({ userId: 2 });

    const res = await request(app)
      .patch("/announcements/1")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ price: 100 });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Access denied" });
    expect(prismaMock.announcement.update).not.toHaveBeenCalled();
  });
});
