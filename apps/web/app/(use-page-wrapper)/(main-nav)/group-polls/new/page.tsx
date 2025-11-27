import { ShellMainAppDir } from "app/(use-page-wrapper)/(main-nav)/ShellMainAppDir";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

import GroupPollsCreateView from "~/group-polls/views/group-polls-create-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    () => "Create Group Poll",
    () => "Create a new group availability poll",
    undefined,
    undefined,
    "/group-polls/new"
  );

const Page = async () => {
  const _headers = await headers();
  const _cookies = await cookies();

  const session = await getServerSession({ req: buildLegacyRequest(_headers, _cookies) });
  if (!session?.user?.id) {
    return redirect("/auth/login");
  }

  return (
    <ShellMainAppDir heading="Create Group Poll" subtitle="Find the best time to meet with multiple people" backPath="/group-polls">
      <GroupPollsCreateView />
    </ShellMainAppDir>
  );
};

export default Page;
