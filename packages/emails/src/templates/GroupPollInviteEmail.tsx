import type { TFunction } from "i18next";

import { APP_NAME, WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import { V2BaseEmailHtml, CallToAction } from "../components";

export type GroupPollInviteProps = {
  language: TFunction;
  organizerName: string;
  pollTitle: string;
  pollLink: string;
  pollDescription?: string;
  recipientName: string;
};

export const GroupPollInviteEmail = (
  props: GroupPollInviteProps & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  const { organizerName, pollTitle, pollLink, pollDescription, recipientName } = props;

  return (
    <V2BaseEmailHtml subject={`${organizerName} invited you to find a meeting time`}>
      <p style={{ fontSize: "24px", marginBottom: "16px", textAlign: "center" }}>
        You&apos;re invited to help find a meeting time
      </p>
      <img
        style={{
          borderRadius: "16px",
          height: "270px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        src={
          IS_PRODUCTION
            ? `${WEBAPP_URL}/emails/calendar-email-hero.png`
            : "http://localhost:3000/emails/calendar-email-hero.png"
        }
        alt=""
      />
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
          marginTop: "32px",
        }}>
        Hi {recipientName},
      </p>
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "16px",
        }}>
        <strong>{organizerName}</strong> has invited you to help find a meeting time for:
      </p>
      <div
        style={{
          backgroundColor: "#f3f4f6",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
        }}>
        <p style={{ fontWeight: 600, fontSize: "18px", margin: "0 0 8px 0" }}>{pollTitle}</p>
        {pollDescription && (
          <p style={{ color: "#6b7280", margin: 0, fontSize: "14px" }}>{pollDescription}</p>
        )}
      </div>
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
        }}>
        Click the button below to view available times and select when you&apos;re free.
      </p>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <CallToAction label="Select Your Availability" href={pollLink} endIconName="linkIcon" />
      </div>
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
          marginTop: "48px",
        }}>
        {props.language("email_no_user_signoff", {
          appName: APP_NAME,
        })}
      </p>

      <div style={{ borderTop: "1px solid #E1E1E1", marginTop: "32px", paddingTop: "32px" }}>
        <p style={{ fontWeight: 400, margin: 0 }}>
          {props.language("have_any_questions")}{" "}
          <a href="mailto:support@cal.com" style={{ color: "#3E3E3E" }} target="_blank" rel="noreferrer">
            {props.language("contact")}
          </a>{" "}
          {props.language("our_support_team")}
        </p>
      </div>
    </V2BaseEmailHtml>
  );
};
