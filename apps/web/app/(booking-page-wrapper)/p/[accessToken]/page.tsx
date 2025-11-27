import type { PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";

import PollResponseView from "~/group-polls/views/poll-response-view";

export const generateMetadata = async ({ params }: PageProps) => {
  const { accessToken } = await params;
  return await _generateMetadata(
    () => "Submit Availability",
    () => "Select the times that work for you",
    false,
    undefined,
    `/p/${accessToken}`
  );
};

const Page = async ({ params }: PageProps) => {
  const { accessToken } = await params;

  return <PollResponseView accessToken={accessToken as string} />;
};

export default Page;
