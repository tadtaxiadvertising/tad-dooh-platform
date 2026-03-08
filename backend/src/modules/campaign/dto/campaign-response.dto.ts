export class CampaignResponseDto {
  campaign_version: number;
  videos: { id: string; url: string; duration: number }[];
}
