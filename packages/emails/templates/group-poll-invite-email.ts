import type { TFunction } from "i18next";

import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import type { GroupPollInviteProps } from "../src/templates/GroupPollInviteEmail";
import BaseEmail from "./_base-email";

export type GroupPollInviteEmailInput = Omit<GroupPollInviteProps, "language"> & {
  language: TFunction;
  recipientEmail: string;
};

export default class GroupPollInviteEmail extends BaseEmail {
  groupPollInvite: GroupPollInviteEmailInput;

  constructor(groupPollInvite: GroupPollInviteEmailInput) {
    super();
    this.name = "SEND_GROUP_POLL_INVITE_EMAIL";
    this.groupPollInvite = groupPollInvite;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    const { organizerName, pollTitle, recipientName, recipientEmail } = this.groupPollInvite;

    return {
      to: recipientEmail,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: `${organizerName} invited you to find a meeting time: ${pollTitle}`,
      html: await renderEmail("GroupPollInviteEmail", this.groupPollInvite),
      text: `${organizerName} has invited ${recipientName} to help find a meeting time for: ${pollTitle}. Click here to respond: ${this.groupPollInvite.pollLink}`,
    };
  }
}
