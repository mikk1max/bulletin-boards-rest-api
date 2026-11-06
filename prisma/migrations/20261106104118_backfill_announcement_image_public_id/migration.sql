-- Derive the Cloudinary public_id from existing image URLs, e.g. ".../upload/v123/announcements/abc.jpg" -> "announcements/abc"
UPDATE "Announcement"
SET "imagePublicId" = regexp_replace(
  substring("imageUrl" FROM '/upload/(?:v[0-9]+/)?(.*)$'),
  '\.[^.]+$',
  ''
)
WHERE "imageUrl" IS NOT NULL AND "imagePublicId" IS NULL;
