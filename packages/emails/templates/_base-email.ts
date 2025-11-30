import { decodeHTML } from "entities";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { getErrorFromUnknown } from "@calcom/lib/errors";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { serverConfig } from "@calcom/lib/serverConfig";
import { setTestEmail } from "@calcom/lib/testEmails";
import { prisma } from "@calcom/prisma";

import { sanitizeDisplayName } from "../lib/sanitizeDisplayName";

export default class BaseEmail {
  name = "";

  protected getTimezone() {
    return "";
  }

  protected getLocale(): string {
    return "";
  }

  protected getFormattedRecipientTime({ time, format }: { time: string; format: string }) {
    return dayjs(time).tz(this.getTimezone()).locale(this.getLocale()).format(format);
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {};
  }
  public async sendEmail() {
    console.log(`[Email Send] Starting sendEmail for ${this.name}`);

    const featuresRepository = new FeaturesRepository(prisma);
    const emailsDisabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("emails");
    /** If email kill switch exists and is active, we prevent emails being sent. */
    if (emailsDisabled) {
      console.warn("[Email Send] Skipped Sending Email due to active Kill Switch");
      return new Promise((r) => r("Skipped Sending Email due to active Kill Switch"));
    }
    console.log("[Email Send] Kill switch check passed");

    if (process.env.INTEGRATION_TEST_MODE === "true") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      setTestEmail(await this.getNodeMailerPayload());
      console.log(
        "Skipped Sending Email as process.env.NEXT_PUBLIC_UNIT_TESTS is set. Emails are available in globalThis.testEmails"
      );
      return new Promise((r) => r("Skipped sendEmail for Unit Tests"));
    }

    const payload = await this.getNodeMailerPayload();
    console.log("[Email Send] Payload generated");

    const from = "from" in payload ? (payload.from as string) : "";
    const to = "to" in payload ? (payload.to as string) : "";
    console.log(`[Email Send] From: ${from}, To: ${to}`);

    if (isSmsCalEmail(to)) {
      console.log(`[Email Send] Skipped Sending Email to faux email: ${to}`);
      return new Promise((r) => r(`Skipped Sending Email to faux email: ${to}`));
    }

    const sanitizedFrom = sanitizeDisplayName(from);
    const sanitizedTo = sanitizeDisplayName(to);

    const parseSubject = z.string().safeParse(payload?.subject);
    const payloadWithUnEscapedSubject = {
      headers: this.getMailerOptions().headers,
      ...payload,
      ...{
        from: sanitizedFrom,
        to: sanitizedTo,
      },
      ...(parseSubject.success && { subject: decodeHTML(parseSubject.data) }),
    };

    // Check if we should use Resend HTTP API (bypasses SMTP port blocking)
    if (process.env.RESEND_API_KEY) {
      console.log("[Email Send] Using Resend HTTP API (SMTP ports blocked)");

      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: sanitizedFrom,
            to: [sanitizedTo],
            subject: parseSubject.success ? decodeHTML(parseSubject.data) : "",
            html: payload.html as string,
            text: payload.text as string,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error("[Email Send] Resend API ERROR:", JSON.stringify(result));
          throw new Error(`Resend API error: ${JSON.stringify(result)}`);
        }

        console.log("[Email Send] Resend API SUCCESS:", JSON.stringify(result));
      } catch (e) {
        console.error("[Email Send] Resend API catch error:", e);
        throw e;
      }
    } else {
      // Fallback to nodemailer SMTP for non-Resend configurations
      console.log("[Email Send] About to create nodemailer transport");
      console.log("[Email Send] Transport config:", JSON.stringify(this.getMailerOptions().transport, null, 2));

      const { createTransport } = await import("nodemailer");
      const transport = createTransport(this.getMailerOptions().transport);

      console.log("[Email Send] Transport created, sending email...");

      await new Promise((resolve, reject) =>
        transport.sendMail(
          payloadWithUnEscapedSubject,
          (_err, info) => {
            if (_err) {
              const err = getErrorFromUnknown(_err);
              console.error("[Email Send] sendMail ERROR:", err.message);
              this.printNodeMailerError(err);
              reject(err);
            } else {
              console.log("[Email Send] sendMail SUCCESS:", JSON.stringify(info));
              resolve(info);
            }
          }
        )
      ).catch((e) => {
        console.error(
          "[Email Send] Promise catch error:",
          `from: ${"from" in payloadWithUnEscapedSubject ? payloadWithUnEscapedSubject.from : ""}`,
          `subject: ${"subject" in payloadWithUnEscapedSubject ? payloadWithUnEscapedSubject.subject : ""}`,
          e
        );
      });
    }
    console.log("[Email Send] sendEmail completed");
    return new Promise((resolve) => resolve("send mail async"));
  }
  protected getMailerOptions() {
    return {
      transport: serverConfig.transport,
      from: serverConfig.from,
      headers: serverConfig.headers,
    };
  }
  protected printNodeMailerError(error: Error): void {
    /** Don't clog the logs with unsent emails in E2E */
    if (process.env.NEXT_PUBLIC_IS_E2E) return;
    console.error(`${this.name}_ERROR`, error);
  }
}
