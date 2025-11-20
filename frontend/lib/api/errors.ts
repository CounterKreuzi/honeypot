type ApiErrorResponse = {
  message?: string;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const apiError = error as { response?: { data?: ApiErrorResponse } };
    const message = apiError.response?.data?.message;
    if (typeof message === 'string') {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
