import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseRequestData } from "app/api/parseRequestData";
import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticator } from "otplib";
import qrcode from "qrcode";

import { ErrorCode } from "@calcom/features/auth/lib/ErrorCode";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { verifyPassword } from "@calcom/features/auth/lib/verifyPassword";
import { symmetricEncrypt } from "@calcom/lib/crypto";
import prisma from "@calcom/prisma";
import { IdentityProvider } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

async function postHandler(req: NextRequest) {
  console.log("[2FA Setup] Starting 2FA setup request");
  const body = await parseRequestData(req);
  console.log("[2FA Setup] Body parsed, password provided:", !!body.password, "password length:", body.password?.length);

  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session) {
    console.log("[2FA Setup] No session found");
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (!session.user?.id) {
    console.error("[2FA Setup] Session is missing a user id.");
    return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
  }

  console.log("[2FA Setup] Session user id:", session.user.id, "email:", session.user.email);

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { password: true } });

  if (!user) {
    console.error("[2FA Setup] Session references user that no longer exists.");
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  console.log("[2FA Setup] User found:", user.id, user.email, "identityProvider:", user.identityProvider, "hasPasswordHash:", !!user.password?.hash);

  if (user.identityProvider !== IdentityProvider.CAL && !user.password?.hash) {
    console.log("[2FA Setup] Third party identity provider enabled without password");
    return NextResponse.json({ error: ErrorCode.ThirdPartyIdentityProviderEnabled }, { status: 400 });
  }

  if (!user.password?.hash) {
    console.log("[2FA Setup] User missing password hash");
    return NextResponse.json({ error: ErrorCode.UserMissingPassword }, { status: 400 });
  }

  if (user.twoFactorEnabled) {
    console.log("[2FA Setup] 2FA already enabled");
    return NextResponse.json({ error: ErrorCode.TwoFactorAlreadyEnabled }, { status: 400 });
  }

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    console.error("[2FA Setup] Missing encryption key; cannot proceed with two factor setup.");
    return NextResponse.json({ error: ErrorCode.InternalServerError }, { status: 500 });
  }

  console.log("[2FA Setup] About to verify password...");
  const isCorrectPassword = await verifyPassword(body.password, user.password.hash);
  console.log("[2FA Setup] Password verification result:", isCorrectPassword);

  if (!isCorrectPassword) {
    console.log("[2FA Setup] Password incorrect - body.password type:", typeof body.password, "hash prefix:", user.password.hash.substring(0, 10));
    return NextResponse.json({ error: ErrorCode.IncorrectPassword }, { status: 400 });
  }

  console.log("[2FA Setup] Password verified successfully, proceeding with 2FA setup");

  // This generates a secret 32 characters in length. Do not modify the number of
  // bytes without updating the sanity checks in the enable and login endpoints.
  const secret = authenticator.generateSecret(20);

  // Generate backup codes with 10 character length
  const backupCodes = Array.from(Array(10), () => crypto.randomBytes(5).toString("hex"));

  await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      backupCodes: symmetricEncrypt(JSON.stringify(backupCodes), process.env.CALENDSO_ENCRYPTION_KEY),
      twoFactorEnabled: false,
      twoFactorSecret: symmetricEncrypt(secret, process.env.CALENDSO_ENCRYPTION_KEY),
    },
  });

  const name = user.email || user.username || user.id.toString();
  const keyUri = authenticator.keyuri(name, "Cal", secret);
  const dataUri = await qrcode.toDataURL(keyUri);

  return NextResponse.json({ secret, keyUri, dataUri, backupCodes });
}

export const POST = defaultResponderForAppDir(postHandler);
