import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { db, users, sessions, accounts, verifications, organizations, members, invitations } from '@healer/db';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'fake_key');
const nodemailerTransport = nodemailer.createTransport({
  host: 'localhost',
  port: 1026,
  secure: false,
});

export async function sendSmartEmail(to: string, subject: string, html: string) {
  if (process.env.NODE_ENV === 'development') {
    await nodemailerTransport.sendMail({
      from: 'Healer Dev <dev@localhost>',
      to,
      subject,
      html,
    });
  } else {
    await resend.emails.send({
      from: 'Healer <noreply@healer.app>',
      to,
      subject,
      html,
    });
  }
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:5007',
  secret: process.env.BETTER_AUTH_SECRET || 'super-secret-better-auth-key-change-me',
  trustedOrigins: [
    'http://localhost:5007',
    'http://localhost:5002',
    'http://localhost:3000',
    'http://127.0.0.1:5007',
    'http://127.0.0.1:5002',
    'http://127.0.0.1:3000',
    (process.env.NEXT_PUBLIC_APP_URL || '').replace(/['"]/g, '').replace(/\/+$/, ''),
    (process.env.BETTER_AUTH_URL || '').replace(/['"]/g, '').replace(/\/+$/, ''),
  ].filter(Boolean),
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      organization: organizations,
      member: members,
      invitation: invitations,
    },
  }),
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
      },
      status: {
        type: 'string',
        required: false,
        defaultValue: 'active',
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    // Enables the forgot-password / reset-password flow.
    // Better Auth calls this hook to deliver the reset link via our smart-email utility.
    sendResetPassword: async (url: string, user: { email: string; name: string }) => {
      await sendSmartEmail(
        user.email,
        'Reset your Healer password',
        `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#059669;margin-bottom:8px">Reset your password</h2>
            <p style="color:#374151;margin-bottom:24px">
              Hi ${user.name || user.email},<br/><br/>
              We received a request to reset your Healer account password.
              Click the button below to choose a new password.
              This link expires in <strong>1 hour</strong>.
            </p>
            <a href="${url}"
              style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px">
              Reset Password
            </a>
            <p style="color:#6b7280;font-size:13px;margin-top:24px">
              If you did not request this, you can safely ignore this email — your password will not change.
            </p>
          </div>
        `,
      );
    },
  },
  plugins: [
    organization(),
  ],
});
