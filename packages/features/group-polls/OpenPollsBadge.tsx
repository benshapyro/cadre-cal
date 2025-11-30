import Link from "next/link";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";

export default function OpenPollsBadge() {
  const { t } = useLocale();
  const { data: openPollsCount } = trpc.viewer.groupPolls.openCount.useQuery();
  if (!openPollsCount) return null;
  return (
    <Link href="/group-polls">
      <Badge
        rounded
        title={t("open_polls_tooltip")}
        variant="orange"
        className="cursor-pointer hover:bg-orange-800 hover:text-orange-100">
        {openPollsCount}
      </Badge>
    </Link>
  );
}
