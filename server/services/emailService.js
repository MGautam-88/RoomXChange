import nodemailer from "nodemailer";

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

export const sendOtpEmail = async (toEmail, otp, purpose) => {
  const transporter = createTransporter();

  const subject =
    purpose === "signup"
      ? "Verify your RoomXChange account"
      : "Reset your RoomXChange password";

  const html = `
    <div style="font-family: Arial, sans-serif; background:#111; color:#eee; padding: 24px; border-radius: 8px;">
      <h2 style="color:#c9f31d; margin-top: 0;">RoomXChange</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color:#c9f31d;">${otp}</p>
      <p>This code expires in 10 minutes. If you did not request this, you can ignore this message.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"RoomXChange" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject,
    html,
  });
};

export const sendNoRoomsNotificationEmail = async (toEmail, userName) => {
  try {
    const transporter = createTransporter();
    const subject = "RoomXChange — Update on your room swap preferences";
    const html = `
      <div style="font-family: Arial, sans-serif; background:#111; color:#eee; padding: 24px; border-radius: 8px; max-width: 520px;">
        <h2 style="color:#c9f31d; margin-top: 0;">RoomXChange</h2>
        <p>Hello <strong>${userName || "Student"}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.5; color: #ddd;">
          Currently, no rooms are available matching your choices. We'll notify you via email as soon as a suitable room is found.
        </p>
        <p style="color: #888; font-size: 14px; margin-top: 20px;">
          You can update your preferred floors and blocks anytime in your RoomXChange Preferences.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"RoomXChange" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send no-rooms notification email:", error.message);
  }
};
