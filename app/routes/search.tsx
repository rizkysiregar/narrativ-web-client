import { Navigate, useSearchParams } from "react-router";

/** Search moved into home; old links (/search?q=...) land there with their term. */
export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const term = searchParams.get("q");
  return <Navigate to={term ? `/?${new URLSearchParams({ q: term }).toString()}` : "/"} replace />;
}
