import { describe, it, expect, vi } from "vitest";
import { HttpExceptionFilter } from "../src/common/filters/http-exception.filter";
import { HttpException, HttpStatus } from "@nestjs/common";
import { ArgumentsHost } from "@nestjs/common";

describe("HttpExceptionFilter Standard Contract (PRD §100)", () => {
  it("should format HttpExceptions into standard error shape", () => {
    const filter = new HttpExceptionFilter();

    const mockJson = vi.fn();
    const mockStatus = vi.fn().mockReturnValue({ json: mockJson });
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: mockStatus,
        }),
      }),
    } as unknown as ArgumentsHost;

    const exception = new HttpException("Course belum dapat diakses.", HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: "HTTP_403",
        message: "Course belum dapat diakses.",
        details: undefined,
      },
    });
  });
});
