import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { db, users, sessions, accounts, verifications, organizations, members, invitations } from '@healer/db';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

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
  },
  plugins: [
    organization(),
  ],
});

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
