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
          path: 12345 as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("renameFile - Input Validation", () => {
    it("should reject non-string filename payloads gracefully", async () => {
      await expect(service.renameFile("media-123", 123 as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should reject empty filename strings", async () => {
      await expect(service.renameFile("media-123", "   ")).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
