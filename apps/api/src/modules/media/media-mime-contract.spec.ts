import {
  withLegacyCampaignMedia,
  withLegacyMediaMime,
} from "./media-mime-contract";

describe("media MIME compatibility", () => {
  it("mirrors the canonical persisted MIME field under the legacy alias", () => {
    const media = {
      id: "media-1",
      mimeType: "video/mp4",
      filename: "spot.mp4",
    };
    const response = withLegacyMediaMime(media);

    expect(response).toEqual({
      id: "media-1",
      mimeType: "video/mp4",
      mime_type: "video/mp4",
      filename: "spot.mp4",
    });
    expect(media).not.toHaveProperty("mime_type");
  });

  it("preserves null MIME values and unrelated campaign fields", () => {
    const campaign = {
      id: "campaign-1",
      advertiserId: "advertiser-1",
      media: [{ id: "media-2", mimeType: null }],
    };
    const response = withLegacyCampaignMedia(campaign);

    expect(response).toEqual({
      id: "campaign-1",
      advertiserId: "advertiser-1",
      media: [{ id: "media-2", mimeType: null, mime_type: null }],
    });
    expect(campaign.media[0]).not.toHaveProperty("mime_type");
  });
});
