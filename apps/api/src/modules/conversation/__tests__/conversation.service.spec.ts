import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { ConversationService } from "../conversation.service";
import { PrismaService } from "../../prisma/prisma.service";

// Type annotation for mockPrisma to avoid circular reference
interface MockPrisma {
  conversation: {
    findUnique: any;
    create: any;
    update: any;
    findMany: any;
    count: any;
  };
  conversationMessage: { create: any; findMany: any };
  $transaction: any;
}

describe("ConversationService", () => {
  let service: ConversationService;

  const mockPrisma: MockPrisma = {
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    conversationMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    jest.clearAllMocks();
  });

  describe("findOrCreateConversation", () => {
    it("should return existing conversation when threadId exists", async () => {
      const existing = {
        id: "conv-1",
        threadId: "thread-123",
        contactPhone: "+18095551234",
        status: "OPEN",
      };
      mockPrisma.conversation.findUnique.mockResolvedValue(existing);

      const result = await service.findOrCreateConversation({
        platform: "WHATSAPP",
        threadId: "thread-123",
        contactPhone: "+18095551234",
      });

      expect(result.conversation).toEqual(existing);
      expect(result.created).toBe(false);
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it("should create new conversation when threadId does not exist", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({
        id: "conv-new",
        threadId: "thread-123",
        status: "OPEN",
      });

      const result = await service.findOrCreateConversation({
        platform: "WHATSAPP",
        threadId: "thread-123",
      });

      expect(result.conversation.threadId).toBe("thread-123");
      expect(result.created).toBe(true);
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe("addMessage", () => {
    it("should add message to conversation", async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue({
        id: "conv-1",
        status: "OPEN",
      });
      mockPrisma.conversationMessage.create.mockResolvedValue({
        id: "msg-1",
        conversationId: "conv-1",
        direction: "INBOUND",
        content: "Hello",
        messageType: "TEXT",
      });

      const result = await service.addMessage({
        conversationId: "conv-1",
        direction: "INBOUND",
        content: "Hello",
      });

      expect(result.content).toBe("Hello");
      expect(mockPrisma.conversationMessage.create).toHaveBeenCalled();
    });
  });
});
