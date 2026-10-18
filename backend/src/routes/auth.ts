import { Router } from "express";
import { prisma } from "../services/prisma";
import { sendMail } from "../services/mailer";
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  signupSchema,
} from "../schemas/auth";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  generateOpaqueToken,
  hashOpaqueToken,
  PASSWORD_RESET_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  signAccessToken,
} from "../utils/tokens";

export const authRouter = Router();

async function issueTokenPair(userId: string) {
  const accessToken = signAccessToken({ userId });
  const refreshToken = generateOpaqueToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
  return { accessToken, refreshToken };
}

authRouter.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, displayName, phone } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const user = await prisma.user.create({
    data: { email, displayName, phone, passwordHash: await hashPassword(password) },
  });

  const tokens = await issueTokenPair(user.id);
  res.status(201).json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    ...tokens,
  });
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const tokens = await issueTokenPair(user.id);
  res.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    ...tokens,
  });
});

authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const tokenHash = hashOpaqueToken(parsed.data.refreshToken);
  const stored = await prisma.refreshToken.findFirst({ where: { tokenHash } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const tokens = await issueTokenPair(stored.userId);
  res.json(tokens);
});

authRouter.post("/logout", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const tokenHash = hashOpaqueToken(parsed.data.refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  res.status(204).send();
});

authRouter.post("/forgot-password", async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  // Always respond 204 regardless of whether the email exists, so this endpoint
  // can't be used to enumerate registered accounts.
  if (user) {
    const resetToken = generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashOpaqueToken(resetToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });
    await sendMail(
      user.email,
      "Reset your Confidence League password",
      `Use this code to reset your password (expires in 1 hour): ${resetToken}`,
    );
  }
  res.status(204).send();
});

authRouter.post("/reset-password", async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { token, newPassword } = parsed.data;

  const tokenHash = hashOpaqueToken(token);
  const stored = await prisma.passwordResetToken.findFirst({ where: { tokenHash } });
  if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
    res.status(401).json({ error: "Invalid or expired reset token" });
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  res.status(204).send();
});
