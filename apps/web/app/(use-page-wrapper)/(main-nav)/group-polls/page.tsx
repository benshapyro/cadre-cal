import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import GroupPollsListView, { GroupPollsCTA } from "~/group-polls/views/group-polls-list-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Group Polls",
    () => "Create and manage group availability polls",
    undefined,
    undefined,
    "/group-polls"
  );

const Page = async () => {
  const _headers = await headers();
  const _cookies = await cookies();

  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  return (
    <ShellMainAppDir
      heading="Group Polls"
      subtitle="Create and manage group availability polls"
      CTA={<GroupPollsCTA />}>
      <GroupPollsListView />
    </ShellMainAppDir>
  );
};

export default Page;
