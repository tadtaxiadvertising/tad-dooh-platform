import { Test, TestingModule } from '@nestjs/testing';
import { ConversationService } from '../conversation.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let prisma: PrismaService;

  const mockPrisma = {
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
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('findOrCreateConversation', () => {
    it('should return existing conversation when threadId exists', async () => {
      const existing = {
        id: 'conv-1',
        threadId: 'thread-123',
        status: 'OPEN',
      };
      mockPrisma.conversation.findUnique.mockResolvedValue(existing);

      const result = await service.findOrCreateConversation({
        platform: 'WHATSAPP',
        threadId: 'thread-123',
        contactId: 'contact-1',
      });

      expect(result).toEqual(existing);
      expect(mockPrisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation when threadId does not exist', async () => {
      mockPrisma.conversation.findUnique.mockResolvedValue(null);
      mockPrisma.conversation.create.mockResolvedValue({
        id: 'conv-new',
        threadId: 'thread-123',
        status: 'OPEN',
      });

      const result = await service.findOrCreateConversation({
        platform: 'WHATSAPP',
        threadId: 'thread-123',
        contactId: 'contact-1',
      });

      expect(result.threadId).toBe('thread-123');
      expect(mockPrisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('addMessage', () => {
    it('should add message to conversation', async () => {
      mockPrisma.conversationMessage.create.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        direction: 'INBOUND',
        content: 'Hello',
        messageType: 'TEXT',
      });

      const result = await service.addMessage({
        conversationId: 'conv-1',
        direction: 'INBOUND',
        content: 'Hello',
      });

      expect(result.content).toBe('Hello');
      expect(mockPrisma.conversationMessage.create).toHaveBeenCalled();
    });
  });
});
