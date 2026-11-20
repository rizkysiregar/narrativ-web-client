import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "~/api/client";
import { ApiError, request } from "~/api/errors";
import { endSession, startSession, updateSessionUser } from "~/api/session";
import type { Schemas } from "~/api/types";
import { postKeys } from "~/features/posts";
import { userKeys } from "~/features/users";
import { postUploadForm } from "~/shared/lib/upload-form";

export type Me = Schemas["UserDetailDTO"];

export const meKeys = { me: ["me"] as const };

// the backend's limits for a profile picture (ProfileImageService)
export const PROFILE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

export function useMe() {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: ({ signal }) => request(api.GET("/users/me", { signal })),
  });
}

/** After the profile changed: the cached copy of the user, their profile page and their posts' author line. */
async function profileChanged(queryClient: ReturnType<typeof useQueryClient>, me: Me) {
  queryClient.setQueryData(meKeys.me, me);
  if (me.username) {
    updateSessionUser({ username: me.username });
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: userKeys.all }),
    queryClient.invalidateQueries({ queryKey: postKeys.all }),
  ]);
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { firstName: string; lastName: string; username: string }) =>
      request(api.PATCH("/users/me", { body })),
    onSuccess: (me) => profileChanged(queryClient, me),
  });
}

/** Uploads a new profile picture straight to storage, then makes it the picture of the account. */
export function useSetProfileImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, onProgress }: { file: File; onProgress: (fraction: number) => void }) => {
      const { uploadForm, objectKey } = await request(
        api.POST("/users/me/profile-image/upload-url", { body: { contentType: file.type } }),
      );
      if (!uploadForm?.url || !objectKey) {
        throw new ApiError(200, "No upload form in the answer");
      }
      await postUploadForm({ url: uploadForm.url, fields: uploadForm.fields ?? {} }, file, onProgress);
      return request(api.PUT("/users/me/profile-image", { body: { objectKey } }));
    },
    onSuccess: (me) => profileChanged(queryClient, me),
  });
}

export function useRemoveProfileImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => request(api.DELETE("/users/me/profile-image")),
    onSuccess: (me) => profileChanged(queryClient, me),
  });
}

export function sendEmailChangeOtp(email: string) {
  return request(api.POST("/users/me/email/otp", { body: { email } }));
}

/**
 * Completes an email change. The backend ends every other session and answers a new one for this device (its
 * refresh token arrives as the HttpOnly cookie).
 */
export function useConfirmEmailChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: { email: string; otp: string; password: string }) =>
      request(api.POST("/users/me/email", { body })),
    onSuccess: async (session) => {
      startSession(session);
      await queryClient.invalidateQueries({ queryKey: meKeys.me });
    },
  });
}

/** Deletes the account for good. The session ends with it, and nothing cached may outlive it. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => request(api.POST("/users/me/deletion", { body: { password } })),
    onSuccess: () => {
      endSession();
      queryClient.clear();
    },
  });
}
