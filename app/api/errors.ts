import type { ErrorBody } from "./types";

/**
 * A failed API call. {@link status} 0 means no answer at all (offline, DNS, aborted); otherwise the backend's error
 * body, whose message is already in the language of the request.
 */
export class ApiError extends Error {
  override readonly name = "ApiError";

  constructor(
    readonly status: number,
    message: string,
    /** Stable identifier from the backend (the name of its GlobalMessage), e.g. UNAUTHORIZED. */
    readonly errorCode?: string,
    readonly args: readonly string[] = [],
  ) {
    super(message);
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  /** The account was banned: the session is over and the message carries the reason. */
  get isBan(): boolean {
    return this.errorCode?.startsWith("USER_BANNED") ?? false;
  }

  static fromBody(status: number, body: unknown): ApiError {
    if (isErrorBody(body)) {
      return new ApiError(status, body.message, body.errorCode, body.args ?? []);
    }
    return new ApiError(status, `HTTP ${status}`);
  }

  static network(cause: unknown): ApiError {
    const error = new ApiError(0, "Network request failed");
    error.cause = cause;
    return error;
  }
}

// error bodies are not typed precisely in the OpenAPI document yet (springdoc lists some as empty objects)
function isErrorBody(body: unknown): body is ErrorBody {
  return typeof body === "object" && body !== null && typeof (body as ErrorBody).message === "string";
}

interface Envelope<T> {
  code: string;
  message: string;
  data?: T;
}

interface FetchResult<T> {
  data?: Envelope<T>;
  error?: unknown;
  response: Response;
}

/**
 * Awaits an openapi-fetch call and answers the `data` of the backend's envelope, or throws an {@link ApiError}.
 *
 * ```ts
 * const me = await request(api.GET("/users/me"));
 * ```
 */
export async function request<T>(call: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await call;
  } catch (cause) {
    throw ApiError.network(cause);
  }
  const { data, error, response } = result;
  if (!response.ok || error !== undefined) {
    throw ApiError.fromBody(response.status, error);
  }
  if (data?.data === undefined) {
    // every success answer of the backend carries data; anything else is a broken contract, not an empty result
    throw new ApiError(response.status, "Response without data");
  }
  return data.data;
}
