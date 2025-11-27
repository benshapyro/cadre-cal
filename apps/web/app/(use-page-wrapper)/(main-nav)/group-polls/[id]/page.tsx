import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import GroupPollsDetailView from "~/group-polls/views/group-polls-detail-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Group Poll",
    () => "View and manage your group availability poll",
    undefined,
    undefined,
    "/group-polls"
  );

type PageProps = {
  params: Promise<{ id: string }>;
};

const Page = async ({ params }: PageProps) => {
  const _headers = await headers();
  const _cookies = await cookies();
  const { id } = await params;

  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  const pollId = parseInt(id, 10);
  if (isNaN(pollId)) {
    return notFound();
  }

  return (
    <ShellMainAppDir heading="Group Poll" subtitle="View and manage your poll" backPath="/group-polls">
      <GroupPollsDetailView pollId={pollId} />
    </ShellMainAppDir>
  );
};

export default Page;
