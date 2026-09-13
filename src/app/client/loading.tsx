import { PageSkeleton } from "@/components/client/skeletons";

/**
 * Segment-level loading UI — the moment the member taps anything in the
 * bottom bar, this skeleton paints INSTANTLY while the server streams the
 * real RSC payload. This is what makes navigation feel zero-latency
 * instead of "waiting on a heavy page".
 */
export default function ClientLoading() {
  return <PageSkeleton />;
}
