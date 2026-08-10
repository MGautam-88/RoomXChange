import nodemailer from "nodemailer";

const createTransporter = () => {
  console.log("========== createTransporter ==========");
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST || "smtp.gmail.com");
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT || 465);
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log(
    "EMAIL_PASS:",
    process.env.EMAIL_PASS ? "Present ✅" : "Missing ❌"
  );

  const port = Number(process.env.EMAIL_PORT) || 465;//Port 587 requires 2 extra STARTTLS handshake roundtrips which cause timeouts on serverless environments like Vercel.
  // SPECIALLY FOR VERCEL: Port 465 uses direct SSL/TLS (secure: true) which is faster and reliable in Serverless Functions
  const secure = port === 465;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
    logger: true,
    debug: true,
  });
};

export const sendOtpEmail = async (toEmail, otp, purpose) => {
  console.log("\n========== sendOtpEmail ==========");
  console.log("To:", toEmail);
  console.log("Purpose:", purpose);
  console.log("OTP:", otp);

  const transporter = createTransporter();

  const isSignup = purpose === "signup";
  const subject = isSignup
    ? "RoomXChange Verification Code"
    : "RoomXChange Password Reset Code";

  const textContent = `Your RoomXChange verification code is: ${otp}\n\nThis 4-digit code is valid for 15 minutes. If you did not request this code, please ignore this email.\n\nRoomXChange Team`;

  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>RoomXChange Verification Code</title>
  </head>
  <body style="margin:0; padding:0; background-color:#0f1115; font-family:Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f1115;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#181b21;border:1px solid #2d323e;border-radius:12px;padding:32px;text-align:left;">
            <tr>
              <td>
                <h2 style="color:#c9f31d;font-size:24px;font-weight:700;margin:0 0 16px 0;">RoomXChange</h2>

                <p style="color:#d1d5db;font-size:15px;line-height:1.5;">
                  Hello, use the following 4-digit verification code to complete your ${isSignup ? "account registration" : "password reset"}:
                </p>

                <div style="background:#0f1115;border:1px solid #c9f31d;border-radius:8px;padding:18px;text-align:center;margin:24px 0;">
                  <span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#c9f31d;">
                    ${otp}
                  </span>
                </div>

                <p style="color:#9ca3af;font-size:13px;">
                  This code is valid for <strong>15 minutes</strong>.
                </p>

                <hr style="border:none;border-top:1px solid #2d323e;margin:24px 0;">

                <p style="color:#6b7280;font-size:12px;">
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

  const mailOptions = {
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
  };

  try {
    console.log("Sending OTP email via Promise wrapper...");

    // SPECIALLY FOR VERCEL SERVERLESS DEPLOYMENT:
    // Wrapping sendMail inside an explicit Promise ensures the Serverless Function does not close/time out before email transmission is finalized.
    const info = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("========== sendOtpEmail Promise ERROR ==========");
          console.error("Message:", err.message);
          console.error("Code:", err.code);
          console.error("Command:", err.command);
          console.error("Response:", err.response);
          reject(err);
        } else {
          console.log("Email sent successfully via Promise ✅");
          console.log("Message ID:", info.messageId);
          console.log("SMTP Response:", info.response);
          resolve(info);
        }
      });
    });

    return info;
  } catch (error) {
    console.error("========== sendOtpEmail ERROR ==========");
    console.error(error);
    throw error;
  }
};

export const sendNoRoomsNotificationEmail = async (toEmail, userName) => {
  console.log("\n========== sendNoRoomsNotificationEmail ==========");
  console.log("To:", toEmail);
  console.log("User:", userName);

  try {
    const transporter = createTransporter();

    const subject = "RoomXChange — Update on your room swap preferences";

    const textContent = `Hello ${userName || "Student"},\n\nCurrently, no rooms are available matching your choices. We will notify you as soon as a suitable room is found.\n\nYou can update your preferences anytime in RoomXChange.\n\nRoomXChange Team`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background:#181b21; color:#eee; padding:24px; border-radius:8px; max-width:520px; border:1px solid #2d323e;">
        <h2 style="color:#c9f31d;">RoomXChange</h2>
        <p>Hello <strong>${userName || "Student"}</strong>,</p>
        <p>Currently, no rooms are available matching your choices. We'll notify you via email as soon as a suitable room is found.</p>
        <p style="color:#888;">You can update your preferences anytime in your RoomXChange Preferences.</p>
      </div>
    `;

    const mailOptions = {
      from: `"RoomXChange" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    };

    // SPECIALLY FOR VERCEL SERVERLESS DEPLOYMENT:
    // Explicit Promise wrapper for Nodemailer in Serverless Functions
    const info = await new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("========== sendNoRoomsNotificationEmail Promise ERROR ==========");
          console.error(err);
          reject(err);
        } else {
          console.log("Notification email sent successfully ✅");
          console.log("Message ID:", info.messageId);
          resolve(info);
        }
      });
    });

    return info;
  } catch (error) {
    console.error("========== sendNoRoomsNotificationEmail ERROR ==========");
    console.error(error);
  }
};