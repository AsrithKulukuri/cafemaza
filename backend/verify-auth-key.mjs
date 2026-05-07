import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const authKey = process.env.MSG91_AUTH_KEY;

console.log("=== Testing SMS OTP Endpoint (to verify auth key) ===\n");
console.log(`Auth Key: ${authKey ? authKey.substring(0, 10) + "..." : "MISSING"}`);

async function testSmsOtp() {
    const smsApiUrl = "https://api.msg91.com/api/sendotp.php";
    const params = {
        authkey: authKey,
        mobile: "918977311418",
        otp: "123456",
        otp_length: "6",
        otp_expiry: "5",
    };

    console.log(`\nEndpoint: ${smsApiUrl}`);
    console.log(`Params:`, params);

    try {
        const response = await axios.get(smsApiUrl, {
            params,
            timeout: 10000,
            validateStatus: () => true,
        });

        console.log(`\nStatus: ${response.status}`);
        console.log(`Response:`, response.data);

        if (response.status === 200) {
            console.log("\n✓ Auth key is VALID (SMS OTP endpoint works)");
            return true;
        } else {
            console.log("\n✗ Auth key appears invalid or error");
            return false;
        }
    } catch (error) {
        console.error(`\n✗ Error: ${error.message}`);
        return false;
    }
}

async function testWhatsAppWebhook() {
    const webhookUrl = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";
    const payload = {
        integrated_number: "15559363844",
        messaging_product: "whatsapp",
        content_type: "template",
        payload: {
            messaging_product: "whatsapp",
            type: "template",
            to: "918977311418",
            template: {
                name: "cafe_maza_otp",
                language: {
                    code: "en",
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: "123456",
                            },
                        ],
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: "0",
                        parameters: [
                            {
                                type: "text",
                                text: process.env.MSG91_OTP_BUTTON_URL_PARAM || "123456",
                            },
                        ],
                    },
                ],
            },
        },
        to: "918977311418",
    };

    console.log(`\n\n=== Testing alternative WhatsApp endpoint ===`);
    console.log(`Endpoint: ${webhookUrl}`);
    console.log(`Payload:`, JSON.stringify(payload, null, 2));

    try {
        const response = await axios.post(webhookUrl, payload, {
            headers: {
                authkey: authKey,
                "Content-Type": "application/json",
            },
            timeout: 10000,
            validateStatus: () => true,
        });

        console.log(`\nStatus: ${response.status}`);
        console.log(`Response:`, response.data);
    } catch (error) {
        console.error(`\nError: ${error.message}`);
    }
}

async function run() {
    const smsValid = await testSmsOtp();

    if (smsValid) {
        console.log("\n→ Auth key works. WhatsApp 401 error might be due to:");
        console.log("  1. Integrated number not configured in MSG91");
        console.log("  2. Template not approved for WhatsApp");
        console.log("  3. WhatsApp channel not enabled on account");
        console.log("  4. Different endpoint or parameter format needed");

        await testWhatsAppWebhook();
    } else {
        console.log("\n→ Auth key appears to be invalid");
    }
}

run();
