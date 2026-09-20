import axios from "axios";

export async function sendRealSMS(mobile, otpCode) {
  try {
    if (!process.env.SMS_API_KEY) {
      console.log(`\n================================`);
      console.log(`📲 [SIMULATED SMS] OTP for +91 ${mobile}: ${otpCode}`);
      console.log(`================================\n`);
      return { success: true };
    }

    // Clean mobile number to ensure it is strictly 10 digits
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);

    console.log(`🔄 Attempting to send live SMS via Fast2SMS to ${cleanMobile}...`);

    // Fast2SMS expects POST requests to pass authorization in the header
    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",
        message: `Your GoTrip verification code is ${otpCode}. Valid for 5 minutes.`,
        language: "english",
        flash: 0,
        numbers: cleanMobile,
      },
      {
        headers: {
          authorization: process.env.SMS_API_KEY,
          "Content-Type": "application/json",
          "cache-control": "no-cache",
        },
      }
    );

    if (response.data && response.data.return === true) {
      console.log(`📲 [SMS GATEWAY SUCCESS] Live SMS sent successfully to ${cleanMobile}`);
    } else {
      throw new Error(response.data.message || "Fast2SMS returned an error response.");
    }

    return { success: true };
  } catch (error) {
    console.error("🚨 LIVE SMS FAILED WITH ERROR:", error.response?.data ? JSON.stringify(error.response.data) : error.message);
    console.log(`\n================================`);
    console.log(`📲 [FALLBACK SMS] OTP for +91 ${mobile}: ${otpCode}`);
    console.log(`================================\n`);
    return { success: true }; // Keeps flow smooth using terminal fallback
  }
}