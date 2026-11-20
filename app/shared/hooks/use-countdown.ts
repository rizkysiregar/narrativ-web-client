import { useEffect, useState } from "react";

/** Seconds left of a countdown that starts at `seconds` when the component mounts; remount it to restart. */
export function useCountdown(seconds: number): number {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, []);

  return left;
}
