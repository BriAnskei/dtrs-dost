import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import { SKELETON_BASE, SKELETON_HIGHLIGHT } from "../constant";

export default function DetailsPageSkeleton() {
  return (
    <SkeletonTheme baseColor={SKELETON_BASE} highlightColor={SKELETON_HIGHLIGHT}>
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading document details"
        className="space-y-6"
      >
        <div className="space-y-4">
          <Skeleton width={190} height={14} />
          <Skeleton width={260} height={60} borderRadius={12} />
          <Skeleton width="60%" height={28} />
        </div>
        <Skeleton height={42} borderRadius={8} />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton height={520} borderRadius={16} />
          </div>
          <div className="space-y-6">
            <Skeleton height={170} borderRadius={16} />
            <Skeleton height={250} borderRadius={16} />
          </div>
        </div>
      </div>
    </SkeletonTheme>
  );
}
