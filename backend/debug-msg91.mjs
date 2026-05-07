import axios from "axios";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const authKey = process.env.MSG91_AUTH_KEY;
const templateName = process.env.MSG91_TEMPLATE_NAME || "cafe_maza_otp";
const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER || "15559363844";

console.log("=== MSG91 WhatsApp API v5 Debug Test ===\n");
console.log("Configuration:");
console.log(`  Auth Key: ${authKey ? authKey.substring(0, 10) + "..." : "MISSING"}`);
console.log(`  Template: ${templateName}`);
console.log(`  Integrated Number: ${integratedNumber}`);
console.log(`  Endpoint: https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/\n`);

const payload = {
    integrated_number: integratedNumber,
    messaging_product: "whatsapp",
    content_type: "template",
    payload: {
        messaging_product: "whatsapp",
        type: "template",
        to: "918977311418",
        template: {
            name: templateName,
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

async function testMethod(name, headers, params = {}) {
    console.log(`\n[TEST] ${name}`);
    console.log(`Headers: ${JSON.stringify(headers, null, 2)}`);
    if (Object.keys(params).length > 0) {
        console.log(`Params: ${JSON.stringify(params, null, 2)}`);
    }

    try {
        const response = await axios.post(
            "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
            payload,
            {
                headers,
                params,
                timeout: 10000,
                validateStatus: () => true, // Don't throw on any status
            }
        );

        console.log(`Status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
        return response.status === 200;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        return false;
    }
}

async function runTests() {
    // Test 1: Authkey header (lowercase)
    await testMethod("Test 1: authkey header (lowercase)", {
        authkey: authKey,
        "Content-Type": "application/json",
    });

    // Test 2: Authkey header (Title Case)
    await testMethod("Test 2: Authkey header (Title Case)", {
        "Authkey": authKey,
        "Content-Type": "application/json",
    });

    // Test 3: Authorization Bearer
    await testMethod("Test 3: Authorization Bearer", {
        "Authorization": `Bearer ${authKey}`,
        "Content-Type": "application/json",
    });

    // Test 4: X-API-Key header
    await testMethod("Test 4: X-API-Key header", {
        "X-API-Key": authKey,
        "Content-Type": "application/json",
    });

    // Test 5: API key in query param
    await testMethod("Test 5: API key in query param", {
        "Content-Type": "application/json",
    }, {
        authkey: authKey,
    });

    // Test 6: Minimal header
    await testMethod("Test 6: Accept everything header", {
        "authkey": authKey,
        "Content-Type": "application/json",
        "Accept": "*/*",
    });
}

runTests().then(() => {
    console.log("\n=== Test Complete ===");
}).catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
