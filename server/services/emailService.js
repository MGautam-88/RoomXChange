import nodemailer from "nodemailer";

const createTransporter = () => {
  const host = (process.env.EMAIL_HOST || "").trim();
  const port = Number(process.env.EMAIL_PORT) || 465;
  const isGmail = !host || host.includes("gmail");

  return nodemailer.createTransport({
    host: isGmail ? "smtp.gmail.com" : host,
    port: isGmail ? 465 : port,
    secure: isGmail ? true : port === 465,
    connectionTimeout: 5000, // 5 seconds max connection timeout (prevents 2-3 min hanging)
    greetingTimeout: 5000,
    socketTimeout: 8000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendOtpEmail = async (toEmail, otp, purpose) => {
  const isSignup = purpose === "signup";
  const subject = isSignup
    ? `${otp} is your RoomXChange verification code`
    : `${otp} is your RoomXChange password reset code`;

  const textContent = `Your RoomXChange verification code is: ${otp}\n\nThis 4-digit code is valid for 15 minutes. If you did not request this code, please ignore this email.\n\nRoomXChange Team`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RoomXChange Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0f1115; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <div style="display: none; max-height: 0px; overflow: hidden;">
          Your 4-digit RoomXChange verification code is ${otp}. Valid for 15 minutes.
        </div>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f1115; padding: 32px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #181b21; border: 1px solid #2d323e; border-radius: 12px; padding: 32px; text-align: left;">
                <tr>
                  <td>
                    <h2 style="color: #c9f31d; font-size: 24px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.5px;">RoomXChange</h2>
                    <p style="color: #d1d5db; font-size: 15px; line-height: 1.5; margin: 0 0 20px 0;">
                      Hello, use the following 4-digit verification code to complete your ${isSignup ? "account registration" : "password reset"}:
                    </p>
                    
                    <div style="background-color: #0f1115; border: 1px solid #c9f31d; border-radius: 8px; padding: 18px; text-align: center; margin: 0 0 24px 0;">
                      <span style="font-family: monospace, Courier, sans-serif; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #c9f31d; display: inline-block;">${otp}</span>
                    </div>
                    
                    <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0;">
                      This code is valid for <strong>15 minutes</strong>. For security purposes, do not share this code with anyone.
                    </p>
                    <hr style="border: none; border-top: 1px solid #2d323e; margin: 24px 0 16px 0;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      If you did not request this email, no action is required.
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

  // Fallback logging if environment variables are omitted
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn(`[OTP FALLBACK LOG] EMAIL_USER / EMAIL_PASS missing on server. Generated OTP for ${toEmail}: ${otp}`);
    return;
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"RoomXChange Security" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
      headers: {
        "X-Priority": "1",
        "X-MSMail-Priority": "High",
        Importance: "High",
      },
    });
    console.log(`[SMTP SUCCESS] OTP email sent successfully to ${toEmail}`);
  } catch (error) {
    console.error(`[SMTP ERROR] Failed to send email to ${toEmail}:`, error.message);
    console.warn(`[OTP FALLBACK LOG] Generated OTP for ${toEmail}: ${otp}`);
    // Non-blocking fallback: Log OTP to server logs so registration flow is unblocked even if SMTP times out
  }
};

export const sendNoRoomsNotificationEmail = async (toEmail, userName) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  try {
    const transporter = createTransporter();
    const subject = "RoomXChange — Update on your room swap preferences";
    const textContent = `Hello ${userName || "Student"},\n\nCurrently, no rooms are available matching your choices. We will notify you as soon as a suitable room is found.\n\nYou can update your preferences anytime in RoomXChange.\n\nRoomXChange Team`;
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background:#181b21; color:#eee; padding: 24px; border-radius: 8px; max-width: 520px; border: 1px solid #2d323e;">
        <h2 style="color:#c9f31d; margin-top: 0;">RoomXChange</h2>
        <p>Hello <strong>${userName || "Student"}</strong>,</p>
        <p style="font-size: 15px; line-height: 1.5; color: #ddd;">
          Currently, no rooms are available matching your choices. We'll notify you via email as soon as a suitable room is found.
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 20px;">
          You can update your preferred floors and blocks anytime in your RoomXChange Preferences.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"RoomXChange" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Failed to send no-rooms notification email:", error.message);
  }
};
