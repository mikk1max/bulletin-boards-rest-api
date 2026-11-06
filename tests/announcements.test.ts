import { existsSync } from "node:fs";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, cloudinaryUpload, cloudinaryDestroy } = vi.hoisted(() => ({
  prismaMock: {
    announcement: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  cloudinaryUpload: vi.fn(),
  cloudinaryDestroy: vi.fn(),
}));

vi.mock("../prisma/client.ts", () => ({ default: prismaMock }));
vi.mock("cloudinary", () => ({
  v2: { config: vi.fn(), uploader: { upload: cloudinaryUpload, destroy: cloudinaryDestroy } },
}));

const { default: app } = await import("../app.ts");
const { generateTokens } = await import("../src/utils/tokens.ts");

const IMAGE_URL = "https://res.cloudinary.com/demo/image/upload/v1/announcements/abc123.jpg";
const IMAGE_PUBLIC_ID = "announcements/abc123";
const OLD_IMAGE_PUBLIC_ID = "announcements/old456";
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
  cloudinaryUpload.mockResolvedValue({ secure_url: IMAGE_URL, public_id: IMAGE_PUBLIC_ID });
  cloudinaryDestroy.mockResolvedValue({ result: "ok" });
  prismaMock.announcement.create.mockImplementation(({ data }) => ({ id: 1, ...data }));
  prismaMock.announcement.update.mockImplementation(({ data }) => ({ id: 1, ...data }));
  prismaMock.announcement.findUnique.mockResolvedValue({ userId: 1, imagePublicId: OLD_IMAGE_PUBLIC_ID });
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
      imagePublicId: IMAGE_PUBLIC_ID,
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
  it("replaces the image and deletes the old one from Cloudinary", async () => {
    const res = await request(app)
      .patch("/announcements/1")
      .set("Authorization", `Bearer ${accessToken}`)
      .attach("image", PNG, { filename: "bike.png", contentType: "image/png" });

    expect(res.status).toBe(200);
    expect(prismaMock.announcement.update.mock.calls[0][0].data).toEqual({
      imageUrl: IMAGE_URL,
      imagePublicId: IMAGE_PUBLIC_ID,
    });
    expect(cloudinaryDestroy).toHaveBeenCalledWith(OLD_IMAGE_PUBLIC_ID, { resource_type: "image", invalidate: true });
  });

  it("keeps the current image when no new image is sent", async () => {
    const res = await request(app)
      .patch("/announcements/1")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ price: 100 });

    expect(res.status).toBe(200);
    expect(cloudinaryDestroy).not.toHaveBeenCalled();
  });

  it("returns 403 when updating someone else's announcement", async () => {
    prismaMock.announcement.findUnique.mockResolvedValue({ userId: 2, imagePublicId: null });

    const res = await request(app)
      .patch("/announcements/1")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ price: 100 });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Access denied" });
    expect(prismaMock.announcement.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /announcements/:id", () => {
  it("deletes the announcement together with its Cloudinary image", async () => {
    const res = await request(app)
      .delete("/announcements/1")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
    expect(prismaMock.announcement.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(cloudinaryDestroy).toHaveBeenCalledWith(OLD_IMAGE_PUBLIC_ID, { resource_type: "image", invalidate: true });
  });
});
