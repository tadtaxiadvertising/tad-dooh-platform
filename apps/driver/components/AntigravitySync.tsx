import { useAntigravity } from "@tad/ui";

export default function AntigravitySync({ enabled }: { enabled?: boolean }) {
  useAntigravity(enabled);
  return null;
}
