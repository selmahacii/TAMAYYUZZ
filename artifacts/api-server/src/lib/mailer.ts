import nodemailer, { type Transporter } from "nodemailer";
import { logger } from "./logger";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL } = process.env;

const smtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

if (!smtpConfigured && process.env.NODE_ENV === "production") {
  logger.warn(
    "[mailer] SMTP_HOST/SMTP_USER/SMTP_PASS are not set — password reset emails will only be logged, not delivered.",
  );
}

let transporter: Transporter | null = null;
function getTransporter(): Transporter | null {
  if (!smtpConfigured) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? Number(SMTP_PORT) : 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendPasswordResetEmail(toEmail: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL ?? "http://localhost:5173"}/reset-password?token=${token}`;
  const tx = getTransporter();

  if (!tx) {
    // No SMTP configured: never expose the token over the API response — log it server-side
    // only, so a developer/admin with log access can still complete the flow during setup.
    logger.info({ toEmail, resetUrl }, "[mailer] SMTP not configured — password reset link (not emailed)");
    return;
  }

  await tx.sendMail({
    from: SMTP_FROM ?? SMTP_USER,
    to: toEmail,
    subject: "Réinitialisation de votre mot de passe",
    text: `Vous avez demandé la réinitialisation de votre mot de passe. Ce lien expire dans 30 minutes :\n\n${resetUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `<p>Vous avez demandé la réinitialisation de votre mot de passe. Ce lien expire dans 30 minutes :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
  });
}
