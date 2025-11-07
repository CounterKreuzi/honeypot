// backend/src/services/email.service.ts
import nodemailer from 'nodemailer';
import * as brevo from '@getbrevo/brevo';

// ============================================================================
// KONFIGURATION
// ============================================================================

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@honig.stefankreuzhuber.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'Honeypot Imkerplattform';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://honig.stefankreuzhuber.com';

// Brevo API Client initialisieren
let brevoClient: brevo.TransactionalEmailsApi | null = null;

if (BREVO_API_KEY) {
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    BREVO_API_KEY
  );
  brevoClient = apiInstance;
}

// Fallback: Nodemailer für lokale Entwicklung (mit Ethereal)
let testTransporter: nodemailer.Transporter | null = null;

async function getTestTransporter() {
  if (!testTransporter) {
    const testAccount = await nodemailer.createTestAccount();
    testTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }
  return testTransporter;
}

// ============================================================================
// HELPER: E-MAIL VERSENDEN
// ============================================================================

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  try {
    if (brevoClient && BREVO_API_KEY) {
      // ✅ Produktiv: Brevo
      const sendSmtpEmail = new brevo.SendSmtpEmail();
      sendSmtpEmail.sender = { name: FROM_NAME, email: FROM_EMAIL };
      sendSmtpEmail.to = [{ email: to }];
      sendSmtpEmail.subject = subject;
      sendSmtpEmail.htmlContent = html;

      await brevoClient.sendTransacEmail(sendSmtpEmail);
      console.log(`✅ E-Mail gesendet an ${to} via Brevo`);
    } else {
      // 🧪 Lokal: Ethereal Test-Mail
      const transporter = await getTestTransporter();
      if (transporter) {
        const info = await transporter.sendMail({
          from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
          to,
          subject,
          html,
        });
        console.log(`🧪 Test-E-Mail gesendet: ${nodemailer.getTestMessageUrl(info)}`);
      }
    }
  } catch (error) {
    console.error('❌ E-Mail-Versand fehlgeschlagen:', error);
    throw new Error('E-Mail konnte nicht gesendet werden');
  }
}

// ============================================================================
// E-MAIL TEMPLATES
// ============================================================================

function getWelcomeEmailTemplate(name: string, verificationLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Willkommen bei Honeypot</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#fef3c7;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;padding:20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px 12px 0 0;">
                  <h1 style="color:#ffffff;margin:0;font-size:32px;">🍯 Honeypot</h1>
                  <p style="color:#fef3c7;margin:10px 0 0;font-size:16px;">Deine Imkerplattform</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1f2937;margin:0 0 20px;">Willkommen, ${name}! 🎉</h2>
                  <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">
                    Danke für deine Registrierung bei Honeypot! Um dein Konto zu aktivieren und dein Profil zu vervollständigen, 
                    bestätige bitte deine E-Mail-Adresse.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${verificationLink}" 
                           style="display:inline-block;padding:14px 40px;background-color:#f59e0b;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
                          E-Mail bestätigen
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0;">
                    Alternativ kannst du diesen Link kopieren und in deinen Browser einfügen:<br>
                    <a href="${verificationLink}" style="color:#f59e0b;word-break:break-all;">${verificationLink}</a>
                  </p>
                  <p style="color:#9ca3af;font-size:13px;margin:30px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;">
                    Der Link ist 24 Stunden gültig. Falls du diese E-Mail nicht angefordert hast, ignoriere sie einfach.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding:20px;text-align:center;background-color:#fef3c7;border-radius:0 0 12px 12px;">
                  <p style="color:#78716c;font-size:12px;margin:0;">
                    © 2024 Honeypot Imkerplattform | <a href="${FRONTEND_URL}" style="color:#d97706;">honig.stefankreuzhuber.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getPasswordResetEmailTemplate(name: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Passwort zurücksetzen</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#fef3c7;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;padding:20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px 12px 0 0;">
                  <h1 style="color:#ffffff;margin:0;font-size:32px;">🍯 Honeypot</h1>
                  <p style="color:#fef3c7;margin:10px 0 0;font-size:16px;">Passwort zurücksetzen</p>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1f2937;margin:0 0 20px;">Hallo, ${name}! 🔐</h2>
                  <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">
                    Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. 
                    Klicke auf den Button unten, um ein neues Passwort zu vergeben.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${resetLink}" 
                           style="display:inline-block;padding:14px 40px;background-color:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
                          Neues Passwort erstellen
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:20px 0 0;">
                    Alternativ kannst du diesen Link kopieren:<br>
                    <a href="${resetLink}" style="color:#dc2626;word-break:break-all;">${resetLink}</a>
                  </p>
                  <p style="color:#9ca3af;font-size:13px;margin:30px 0 0;padding-top:20px;border-top:1px solid #e5e7eb;">
                    ⚠️ Der Link ist 1 Stunde gültig. Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="padding:20px;text-align:center;background-color:#fef3c7;border-radius:0 0 12px 12px;">
                  <p style="color:#78716c;font-size:12px;margin:0;">
                    © 2024 Honeypot Imkerplattform | <a href="${FRONTEND_URL}" style="color:#d97706;">honig.stefankreuzhuber.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function getProfileActivatedEmailTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Profil aktiviert</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#fef3c7;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;padding:20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#10b981,#059669);border-radius:12px 12px 0 0;">
                  <h1 style="color:#ffffff;margin:0;font-size:32px;">🍯 Honeypot</h1>
                  <p style="color:#d1fae5;margin:10px 0 0;font-size:16px;">Profil aktiviert!</p>
                </td>
              </tr>
              <tr>
                <td style="padding:40px;">
                  <h2 style="color:#1f2937;margin:0 0 20px;">Glückwunsch, ${name}! 🎊</h2>
                  <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">
                    Dein Imker-Profil ist jetzt <strong>live auf der Karte sichtbar</strong>! 
                    Kunden in deiner Nähe können dich ab sofort finden.
                  </p>
                  <div style="background-color:#f0fdf4;border-left:4px solid #10b981;padding:15px;margin:20px 0;">
                    <p style="color:#166534;margin:0;font-weight:bold;">📍 Dein Profil ist sichtbar</p>
                    <p style="color:#166534;margin:5px 0 0;font-size:14px;">Kunden können dich jetzt über die Karte entdecken</p>
                  </div>
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${FRONTEND_URL}/meinbereich" 
                           style="display:inline-block;padding:14px 40px;background-color:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">
                          Mein Profil bearbeiten
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="color:#6b7280;font-size:14px;margin:20px 0 0;">
                    Tipp: Füge Fotos und Honig-Sorten hinzu, um mehr Kunden anzulocken! 🍯
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px;text-align:center;background-color:#fef3c7;border-radius:0 0 12px 12px;">
                  <p style="color:#78716c;font-size:12px;margin:0;">
                    © 2024 Honeypot Imkerplattform | <a href="${FRONTEND_URL}" style="color:#d97706;">honig.stefankreuzhuber.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export const emailService = {
  /**
   * Sendet E-Mail, um die Registrierung fortzusetzen (Intent-Link)
   */
  async sendRegistrationIntentEmail(email: string, token: string): Promise<void> {
    const continueLink = `${FRONTEND_URL}/imker-werden/fortsetzen?token=${token}`;
    const html = `
      <!DOCTYPE html>
      <html lang="de">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Registrierung fortsetzen</title>
      </head>
      <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#fef3c7;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef3c7;padding:20px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:12px 12px 0 0;">
                    <h1 style="color:#ffffff;margin:0;font-size:28px;">🍯 Honeypot</h1>
                    <p style="color:#fef3c7;margin:10px 0 0;font-size:16px;">Registrierung fortsetzen</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:36px;">
                    <p style="color:#1f2937;line-height:1.6;margin:0 0 16px;">Hallo!</p>
                    <p style="color:#4b5563;line-height:1.6;margin:0 0 16px;">
                      Du hast begonnen, dich bei Honeypot zu registrieren. Klicke auf den Button, um die Registrierung fortzusetzen und dein Passwort festzulegen.
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                      <tr>
                        <td align="center">
                          <a href="${continueLink}" style="display:inline-block;padding:14px 28px;background-color:#d97706;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">Registrierung fortsetzen</a>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#6b7280;font-size:12px;margin:24px 0 0;">Dieser Link ist 24 Stunden gültig.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px;text-align:center;background-color:#fef3c7;border-radius:0 0 12px 12px;">
                    <p style="color:#78716c;font-size:12px;margin:0;">© 2024 Honeypot Imkerplattform | <a href="${FRONTEND_URL}" style="color:#d97706;">honig.stefankreuzhuber.com</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    await sendEmail(email, 'Deine Registrierung bei Honeypot – weiter geht’s', html);
  },
  /**
   * Sendet Willkommens-E-Mail mit Verifizierungslink
   */
  async sendWelcomeEmail(email: string, name: string, verificationToken: string): Promise<void> {
    const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const html = getWelcomeEmailTemplate(name, verificationLink);
    await sendEmail(email, 'Willkommen bei Honeypot! Bestätige deine E-Mail 🍯', html);
  },

  /**
   * Sendet Passwort-Reset-E-Mail
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<void> {
    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = getPasswordResetEmailTemplate(name, resetLink);
    await sendEmail(email, 'Passwort zurücksetzen | Honeypot 🔐', html);
  },

  /**
   * Sendet Benachrichtigung wenn Profil aktiviert wurde
   */
  async sendProfileActivatedEmail(email: string, name: string): Promise<void> {
    const html = getProfileActivatedEmailTemplate(name);
    await sendEmail(email, 'Dein Profil ist jetzt live! 🎉', html);
  },

  /**
   * Sendet einfache Benachrichtigungs-E-Mail
   */
  async sendNotification(email: string, subject: string, message: string): Promise<void> {
    const html = `
      <div style="font-family:Arial,sans-serif;padding:20px;max-width:600px;margin:0 auto;">
        <h2 style="color:#f59e0b;">🍯 Honeypot</h2>
        <p style="color:#4b5563;line-height:1.6;">${message}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
        <p style="color:#9ca3af;font-size:12px;">© 2024 Honeypot Imkerplattform</p>
      </div>
    `;
    await sendEmail(email, subject, html);
  },
};
