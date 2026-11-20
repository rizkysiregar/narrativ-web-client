import { Link } from "react-router";

import { nonBlank } from "~/shared/lib/text";
import { Avatar } from "~/shared/ui/avatar";

interface UserRowProps {
  username: string;
  name?: string | undefined;
  imageUrl?: string | undefined;
}

/** One person in a list (search results, followers): picture, name and username, linking to the profile. */
export function UserRow({ username, name, imageUrl }: UserRowProps) {
  const displayName = nonBlank(name);

  return (
    <li>
      <Link
        to={`/u/${username}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-plum"
      >
        <Avatar src={imageUrl} name={username} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{displayName ?? `@${username}`}</span>
          {displayName && <span className="truncate text-sm text-muted">@{username}</span>}
        </span>
      </Link>
    </li>
  );
}
