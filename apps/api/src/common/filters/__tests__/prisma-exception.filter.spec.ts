import { ArgumentsHost, HttpStatus } from "@nestjs/common";
import { PrismaClientExceptionFilter } from "../prisma-exception.filter";

describe("PrismaClientExceptionFilter", () => {
  let filter: PrismaClientExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new PrismaClientExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => ({ url: "/test-endpoint" }),
      }),
    } as unknown as ArgumentsHost;
  });

  it("should sanitize PrismaClientValidationError and return 400 without leaking raw message", () => {
    const rawSensitiveMessage =
      "Invalid `prisma.user.findUnique()` invocation: Unknown argument `secret_internal_column`. Available options are: id, email...";
    const validationError = new Error(rawSensitiveMessage);
    (validationError as any).validation = true;

    filter.catch(validationError, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Error de validación en la solicitud.",
        errorCode: "UNKNOWN",
      }),
    );
    expect(mockResponse.json).not.toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("secret_internal_column"),
      }),
    );
  });

  it("should handle Prisma P2002 known request error", () => {
    const knownError = new Error("Unique constraint failed");
    (knownError as any).code = "P2002";
    (knownError as any).meta = { target: ["email"] };

    filter.catch(knownError, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.CONFLICT,
        message: "Ya existe un registro con este/a: email.",
        errorCode: "P2002",
      }),
    );
  });

  it("should handle Prisma P2025 not found error", () => {
    const knownError = new Error("An operation failed because it depends on one or more records that were required but not found.");
    (knownError as any).code = "P2025";

    filter.catch(knownError, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Registro no encontrado.",
        errorCode: "P2025",
      }),
    );
  });
});
