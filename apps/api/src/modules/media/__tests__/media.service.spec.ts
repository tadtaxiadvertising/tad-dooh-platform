import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";
import { MediaService } from "../media.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SupabaseService } from "../../supabase/supabase.service";

describe("MediaService - Security & Validation", () => {
  let service: MediaService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === "CDN_URL_PREFIX") return "https://cdn.example.com";
      if (key === "SUPABASE_URL") return "https://supabase.example.com";
      return null;
    }),
  };

  const mockPrismaService = {
    media: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockSupabaseClient = {
    storage: {
      from: jest.fn().mockReturnValue({
        download: jest.fn(),
      }),
    },
  };

  const mockSupabaseService = {
    getClient: jest.fn().mockReturnValue(mockSupabaseClient),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SupabaseService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  describe("confirmUpload - Path Traversal Protection", () => {
    it("should reject paths with relative path traversal (..)", async () => {
      await expect(
        service.confirmUpload({
          path: "../advertiser-uploads/secret.mp4",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject paths starting with /", async () => {
      await expect(
        service.confirmUpload({
          path: "/etc/passwd",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject paths containing backslashes", async () => {
      await expect(
        service.confirmUpload({
          path: "..\\advertiser-uploads\\secret.mp4",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject non-string paths", async () => {
      await expect(
        service.confirmUpload({
          // @ts-expect-error A JSON caller can supply a number; exercise the runtime validation.
          path: 12345,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("renameFile - Input Validation", () => {
    it("should reject non-string filename payloads gracefully", async () => {
      // @ts-expect-error Deliberately malformed runtime input must produce BadRequestException.
      await expect(service.renameFile("media-123", 123)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject empty filename strings", async () => {
      await expect(service.renameFile("media-123", "   ")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("MIME column mapping compatibility (#217)", () => {
    it.each(["video/mp4", "image/png", null])(
      "returns both MIME names from canonical stored value %s",
      async (mimeType) => {
        mockPrismaService.media.findUnique.mockResolvedValue({
          id: "media-synthetic",
          mimeType,
          fileSize: BigInt(5),
          campaign: null,
        });
        const response = await service.getMediaById("media-synthetic");
        expect(response.mimeType).toBe(mimeType);
        expect(response.mime_type).toBe(mimeType);
      },
    );
    it("keeps the legacy alias on metadata-update responses", async () => {
      mockPrismaService.media.update.mockResolvedValue({
        id: "media-synthetic",
        mimeType: "image/jpeg",
        fileSize: BigInt(5),
      });
      const response = await service.updateMedia("media-synthetic", {
        qrUrl: "https://example.invalid/",
      });
      expect(response).toMatchObject({
        mimeType: "image/jpeg",
        mime_type: "image/jpeg",
        fileSize: 5,
      });
    });
  });
});
