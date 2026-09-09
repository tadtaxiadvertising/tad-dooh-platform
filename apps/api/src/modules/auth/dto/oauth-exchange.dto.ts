import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * Roles permitted to authenticate via Google OAuth.
 * Drivers use phone + password and are explicitly excluded.
 */
export enum OAuthPortalRole {
  ADMIN = "ADMIN",
  ADVERTISER = "ADVERTISER",
}

export class OAuthExchangeDto {
  @ApiProperty({
    description: "Supabase access_token returned after Google OAuth consent.",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;

  @ApiProperty({
    description: "Supabase refresh_token (optional but recommended).",
    required: false,
  })
  @IsString()
  refresh_token?: string;

  @ApiProperty({
    description:
      "Which portal the user is signing into. Driver portal is excluded.",
    enum: OAuthPortalRole,
    example: OAuthPortalRole.ADMIN,
  })
  @IsEnum(OAuthPortalRole)
  intended_role: OAuthPortalRole;
}
