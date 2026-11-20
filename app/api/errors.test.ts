import { describe, expect, it } from "vitest";

import { ApiError, request } from "./errors";

const answer = (
  status: number,
  body: { data?: { code: string; message: string; data?: unknown }; error?: unknown },
) => Promise.resolve({ ...body, response: new Response(null, { status }) });

describe("request", () => {
  it("answers the data of the envelope", async () => {
    await expect(
      request(answer(200, { data: { code: "200", message: "Success", data: { id: 7 } } })),
    ).resolves.toEqual({
      id: 7,
    });
  });

  it("throws the backend's error", async () => {
    const error = await request(
      answer(400, {
        error: { code: "400", message: "Username is taken", errorCode: "USERNAME_TAKEN", args: ["ani"] },
      }),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      message: "Username is taken",
      errorCode: "USERNAME_TAKEN",
      args: ["ani"],
    });
  });

  it("throws a generic error for a body that is not an error body", async () => {
    await expect(request(answer(502, { error: "Bad gateway" }))).rejects.toMatchObject({
      status: 502,
      message: "HTTP 502",
      errorCode: undefined,
    });
  });

  it("throws a network error when there is no answer", async () => {
    const error = await request(Promise.reject(new TypeError("Failed to fetch"))).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNetworkError).toBe(true);
  });

  it("treats a success without data as a broken contract", async () => {
    await expect(request(answer(200, { data: { code: "200", message: "Success" } }))).rejects.toBeInstanceOf(
      ApiError,
    );
  });
});

describe("ApiError", () => {
  it("recognises a ban", () => {
    expect(ApiError.fromBody(401, { message: "Banned", errorCode: "USER_BANNED" }).isBan).toBe(true);
    expect(ApiError.fromBody(401, { message: "Banned: spam", errorCode: "USER_BANNED_REASON" }).isBan).toBe(
      true,
    );
    expect(ApiError.fromBody(401, { message: "Expired", errorCode: "UNAUTHORIZED" }).isBan).toBe(false);
  });
});
