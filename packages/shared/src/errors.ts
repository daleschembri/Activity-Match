export const ErrorCode = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
  NOT_PERMITTED: "NOT_PERMITTED",
  INVALID_STATE: "INVALID_STATE",
  ACTIVITY_FULL: "ACTIVITY_FULL",
  ACTIVITY_NOT_JOINABLE: "ACTIVITY_NOT_JOINABLE",
  DEADLINE_PASSED: "DEADLINE_PASSED",
  ALREADY_REQUESTED: "ALREADY_REQUESTED",
  AGE_RESTRICTED: "AGE_RESTRICTED",
  SCREENING_REQUIRED: "SCREENING_REQUIRED",
  BLOCKED: "BLOCKED",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  VERIFICATION_FAILED: "VERIFICATION_FAILED",
  EXTRACTION_UNAVAILABLE: "EXTRACTION_UNAVAILABLE",
  CONFLICT: "CONFLICT",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface ApiError {
  code: ErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
  retry_after?: number;
}

export interface ApiSuccess<T> {
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | { error: ApiError };

export function isApiError<T>(
  response: ApiResponse<T>,
): response is { error: ApiError } {
  return "error" in response;
}
