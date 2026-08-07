import nodemailer from "nodemailer";

const createTransporter = () => {
  console.log("========== createTransporter ==========");
  console.log("EMAIL_HOST:", process.env.EMAIL_HOST || "smtp.gmail.com");
  console.log("EMAIL_PORT:", process.env.EMAIL_PORT || 587);
  console.log("EMAIL_USER:", process.env.EMAIL_USER);
  console.log(
    "EMAIL_PASS:",
    process.env.EMAIL_PASS ? "Present ✅" : "Missing ❌"
  );

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
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
    ? `${otp} is your RoomXChange verification code`
    : `${otp} is your RoomXChange password reset code`;

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
                  Hello, use the following 4-digit verification code to complete your ${isSignup ? "account registration" : "password reset"
    }:
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

  try {
    console.log("Verifying SMTP connection...");

    try {
      await transporter.verify();
      console.log("SMTP verification successful ✅");
    } catch (err) {
      console.error("verify() failed");
      console.error(err);
      throw err;
    }

    console.log("Sending OTP email...");

    const info = await transporter.sendMail({
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

    console.log("Email sent successfully ✅");
    console.log("Message ID:", info.messageId);
    console.log("SMTP Response:", info.response);
  } catch (error) {
    console.error("========== sendOtpEmail ERROR ==========");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Command:", error.command);
    console.error("Response:", error.response);
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

    console.log("Verifying SMTP connection...");
    await transporter.verify();
    console.log("SMTP verification successful ✅");

    const subject =
      "RoomXChange — Update on your room swap preferences";

    const textContent = `Hello ${userName || "Student"
      },\n\nCurrently, no rooms are available matching your choices. We will notify you as soon as a suitable room is found.\n\nYou can update your preferences anytime in RoomXChange.\n\nRoomXChange Team`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background:#181b21; color:#eee; padding:24px; border-radius:8px; max-width:520px; border:1px solid #2d323e;">
        <h2 style="color:#c9f31d;">RoomXChange</h2>
        <p>Hello <strong>${userName || "Student"}</strong>,</p>
        <p>Currently, no rooms are available matching your choices. We'll notify you via email as soon as a suitable room is found.</p>
        <p style="color:#888;">You can update your preferences anytime in your RoomXChange Preferences.</p>
      </div>
    `;

    console.log("Sending notification email...");

    const info = await transporter.sendMail({
      from: `"RoomXChange" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log("Notification email sent successfully ✅");
    console.log("Message ID:", info.messageId);
    console.log("SMTP Response:", info.response);
  } catch (error) {
    console.error("========== sendNoRoomsNotificationEmail ERROR ==========");
    console.error("Message:", error.message);
    console.error("Code:", error.code);
    console.error("Command:", error.command);
    console.error("Response:", error.response);
    console.error(error);
  }
};