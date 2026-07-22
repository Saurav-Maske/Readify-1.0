const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(toEmail, otp) {
  const html = `
    <div style="margin:0;padding:0;background:#f4f5ff;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f5ff;padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:linear-gradient(135deg,#0f172a 0%,#5b5ceb 52%,#8b5cf6 100%);border-radius:24px;overflow:hidden;box-shadow:0 18px 45px rgba(91,92,235,0.24);">
              <tr>
                <td style="padding:28px 28px 18px;">
                  <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(255,255,255,0.12);padding:8px 12px;border-radius:999px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.6px;">
                    READIFY
                  </div> 
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px; text-align:center;">
                  <h1 style="margin:0 0 10px;font-size:30px;line-height:1.2;color:#ffffff;font-weight:700;">Your verification code</h1>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.86);">
                    Use the code below to continue securely. This code expires in 10 minutes.
                  </p>
                  <div style="display:inline-block;padding:18px 24px;border-radius:18px;background:#ffffff;color:#111827;font-size:34px;font-weight:800;letter-spacing:8px;box-shadow:0 10px 35px rgba(0,0,0,0.18);">
                    ${otp}
                  </div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 28px 28px;">
                  <div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.18);border-radius:18px;padding:16px 18px;color:#f8fafc;font-size:13px;line-height:1.7;">
                    Never share this code with anyone. If you did not request this, you can safely ignore this email.
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Your Readify verification code',
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
    html,
  });
}

module.exports = { sendOtpEmail };