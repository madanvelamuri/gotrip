import nodemailer from "nodemailer";

// Local development open-source transporter (e.g., Mailpit or standard SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: process.env.SMTP_PORT || 1025, // Default port for open-source mail catchers like Mailpit
  secure: false,
  auth: process.env.SMTP_USER ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
});

export async function sendOpenSourceNotification({ email, mobile, otpCode }) {
  // 1. Send Email via Open-Source / SMTP Transport
  if (email) {
    try {
      await transporter.sendMail({
        from: '"GoTrip Open Source" <no-reply@gotrip.local>',
        to: email,
        subject: "Your GoTrip Verification Code",
        text: `Your open-source verification code is: ${otpCode}`,
      });
      console.log(`📧 [OPEN-SOURCE EMAIL] Sent to ${email}`);
    } catch (err) {
      console.log(`\n================================`);
      console.log(`📧 [EMAIL FALLBACK] OTP for ${email}: ${otpCode}`);
      console.log(`================================\n`);
    }
  }

  // 2. Send Mobile via Local Terminal Simulation or Open-Source Android Gateway
  if (mobile) {
    // If you are using an open-source Android gateway app, you can fetch your local API here.
    // Otherwise, print to terminal console for 100% free local testing:
    console.log(`\n================================`);
    console.log(`📲 [OPEN-SOURCE SMS GATEWAY] OTP for +91 ${mobile}: ${otpCode}`);
    console.log(`================================\n`);
  }
}