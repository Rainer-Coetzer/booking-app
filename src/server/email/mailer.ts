import 'server-only';
import nodemailer from 'nodemailer';

export interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: { filename: string; content: string; contentType: string }[];
}

export interface Mailer {
  name: string;
  send(message: Message): Promise<void>;
}

const from = () => process.env.EMAIL_FROM || 'Bookings <bookings@localhost>';

const consoleMailer: Mailer = {
  name: 'console',
  async send(m) {
    console.info(`[email] to=${m.to} subject="${m.subject}"\n${m.text}\n`);
  },
};

function smtpMailer(): Mailer {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return {
    name: 'smtp',
    async send(m) {
      await transport.sendMail({ from: from(), ...m });
    },
  };
}

function resendMailer(): Mailer {
  return {
    name: 'resend',
    async send(m) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: from(),
          to: [m.to],
          subject: m.subject,
          text: m.text,
          html: m.html,
          reply_to: m.replyTo,
          attachments: m.attachments?.map((a) => ({
            filename: a.filename,
            content: Buffer.from(a.content).toString('base64'),
            content_type: a.contentType,
          })),
        }),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
    },
  };
}

let mailer: Mailer | undefined;

export function getMailer(): Mailer {
  if (mailer) return mailer;
  switch (process.env.EMAIL_PROVIDER) {
    case 'smtp':
      return (mailer = smtpMailer());
    case 'resend':
      return (mailer = resendMailer());
    default:
      return (mailer = consoleMailer);
  }
}

/** Test hook. */
export function setMailer(m: Mailer | undefined) {
  mailer = m;
}
