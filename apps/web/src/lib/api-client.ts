import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from "@unicom/types";

const BASE_API_URL =
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      const errorData = data as ApiErrorResponse;
      throw new ApiError(
        errorData.error?.code || "API_ERROR",
        errorData.error?.message || "Terjadi kesalahan pada server",
        errorData.error?.details,
      );
    }

    return (data as ApiSuccessResponse<T>).data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "Gagal terhubung ke server",
    );
  }
}
