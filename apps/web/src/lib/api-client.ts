import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from "@unicom/types";

export const getBaseApiUrl = (): string => {
  if (process.env["NEXT_PUBLIC_API_URL"]) {
    return process.env["NEXT_PUBLIC_API_URL"];
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://unicom-university-production.up.railway.app/api/v1";
  }
  return "http://localhost:4000/api/v1";
};

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
  const baseUrl = getBaseApiUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

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
