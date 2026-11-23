import { Navigate } from "react-router";

/** Explore is gone: home mixes suggestions into the feed. Old links land on home. */
export default function Explore() {
  return <Navigate to="/" replace />;
}
