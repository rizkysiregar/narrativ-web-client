import type { Schemas } from "~/api/types";

type Post = Schemas["PostFeedResponse"];

let sequence = 0;

export function post(overrides: Partial<Post> = {}): Post {
  sequence += 1;
  return {
    id: `post-${sequence}`,
    userId: "u-ani",
    username: "ani",
    caption: `Story number ${sequence}`,
    createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    likeCount: 3,
    commentCount: 1,
    liked: false,
    suggested: false,
    moderationStatus: "ACTIVE",
    media: [],
    ...overrides,
  };
}

/** One page of a cursor feed; `next` is the cursor of the following page, absent on the last one. */
export function feedPage(content: Post[], next?: string) {
  return {
    content,
    last: next === undefined,
    nextCursor: next,
    pageNumber: -1,
    pageSize: 10,
    totalElements: -1,
    totalPages: -1,
  };
}

/** One page of a numbered list. */
export function numberedPage<T>(content: T[], pageNumber = 0, last = true) {
  return { content, last, pageNumber, pageSize: 20, totalElements: content.length, totalPages: 1 };
}
