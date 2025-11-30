import type SendmailTransport from "nodemailer/lib/sendmail-transport";
import type SMTPConnection from "nodemailer/lib/smtp-connection";

import { isENVDev } from "@calcom/lib/env";

import { getAdditionalEmailHeaders } from "./getAdditionalEmailHeaders";

function detectTransport(): SendmailTransport.Options | SMTPConnection.Options | string {
  // Debug logging for email configuration
  console.log("[Email Config] Detecting transport...");
  console.log("[Email Config] RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  console.log("[Email Config] RESEND_API_KEY length:", process.env.RESEND_API_KEY?.length || 0);
  console.log("[Email Config] EMAIL_FROM:", process.env.EMAIL_FROM);
  console.log("[Email Config] EMAIL_SERVER exists:", !!process.env.EMAIL_SERVER);
  console.log("[Email Config] EMAIL_SERVER_HOST:", process.env.EMAIL_SERVER_HOST);

  if (process.env.RESEND_API_KEY) {
    // Use port 587 (STARTTLS) instead of 465 (SSL) - some platforms block 465
    console.log("[Email Config] Using RESEND SMTP transport (smtp.resend.com:587 STARTTLS)");
    const transport = {
      host: "smtp.resend.com",
      secure: false, // Use STARTTLS instead of direct SSL
      port: 587,
      auth: {
        user: "resend",
        pass: process.env.RESEND_API_KEY,
      },
      tls: {
        // Upgrade to TLS after connection (STARTTLS)
        ciphers: "SSLv3",
      },
    };

    return transport;
  }

  if (process.env.EMAIL_SERVER) {
    console.log("[Email Config] Using EMAIL_SERVER connection string");
    return process.env.EMAIL_SERVER;
  }

  if (process.env.EMAIL_SERVER_HOST) {
    console.log("[Email Config] Using EMAIL_SERVER_HOST:", process.env.EMAIL_SERVER_HOST);
    const port = parseInt(process.env.EMAIL_SERVER_PORT || "");
    const auth =
      process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD
        ? {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
          }
        : undefined;

    const transport = {
      host: process.env.EMAIL_SERVER_HOST,
      port,
      auth,
      secure: port === 465,
      tls: {
        rejectUnauthorized: !isENVDev,
      },
    };

    return transport;
  }

  console.log("[Email Config] WARNING: Falling back to sendmail (likely won't work in container!)");
  return {
    sendmail: true,
    newline: "unix",
    path: "/usr/sbin/sendmail",
  };
}

export const serverConfig = {
  transport: detectTransport(),
  from: process.env.EMAIL_FROM,
  headers: getAdditionalEmailHeaders()[process.env.EMAIL_SERVER_HOST || ""] || undefined,
};
