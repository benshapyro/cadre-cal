import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";

import PublicPollView from "~/group-polls/views/public-poll-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const { shareSlug } = await params;
  return await _generateMetadata(
    () => "Submit Availability",
    () => "Select participants and submit availability for this group poll",
    false,
    undefined,
    `/poll/${shareSlug}`
  );
};

const Page = async ({ params }: PageProps) => {
  const { shareSlug } = await params;

  return <PublicPollView shareSlug={shareSlug as string} />;
};

export default Page;
