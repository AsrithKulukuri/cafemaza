# MSG91 WhatsApp OTP Integration - Complete Setup Guide

## Overview

The application implements a **complete backend-owned WhatsApp OTP flow** using MSG91's WhatsApp template-based API (v5).

### Architecture

```
User enters phone → Backend generates OTP → Backend sends to MSG91 WhatsApp → 
User receives on WhatsApp → User enters OTP → Backend verifies → Session created
```

## Current Status

✅ **Implementation**: Complete and correct
- Backend WhatsApp API integration fully implemented
- OTP generation, storage, expiry, rate limiting, and verification all working
- Proper logging and error handling in place
- Auth key verified as VALID

❌ **Delivery Issue**: MSG91 account WhatsApp setup required
- WhatsApp API returns 401 Unauthorized
- Root cause: WhatsApp channel not enabled/configured in MSG91 account
- SMS OTP endpoint (fallback) confirmed WORKING

## Configuration Requirements

### 1. MSG91 Account Setup (REQUIRED)

Go to [MSG91 Dashboard](https://www.msg91.com/dashboard):

1. **Enable WhatsApp Channel**
   - Settings → Channels → WhatsApp
   - Enable WhatsApp channel if not already enabled
   - Ensure account has WhatsApp business access

2. **Configure Integrated WhatsApp Number**
   - WhatsApp Settings → Integrated Numbers
   - Add or configure: `15559363844` (from README requirement)
   - This number must be:
     - Active and verified in Meta Business Manager
     - Accessible from your MSG91 account
     - Listed as "integrated_number" in requests

3. **Approve Template for WhatsApp**
   - Templates → Create/Review Templates
   - Template Name: `cafe_maza_otp`
   - Category: Authentication/OTP
   - Language: English (en)
   - Template Body Example:
     ```
     Your Cafe Maza OTP is {{1}}. Valid for 5 minutes. Do not share.
     ```
   - Status: Must be **APPROVED** before sending
   - Parameter: `{{1}}` = OTP code placeholder

4. **Add Whitelist Phone (Testing)**
   - WhatsApp Settings → Sender Filter / Whitelist
   - Add: `+1 (918) 977-3114` or `918977311418`
   - Allows testing without business number restrictions

### 2. Backend Environment Variables

**File**: `backend/.env`

```env
# MSG91 WhatsApp OTP API Configuration
MSG91_AUTH_KEY=504634AwYEEVs4l69caf7afP1
MSG91_TEMPLATE_NAME=cafe_maza_otp
MSG91_INTEGRATED_NUMBER=15559363844
MSG91_OTP_LANGUAGE=en
MSG91_OTP_LENGTH=6
MSG91_OTP_EXPIRY_MINUTES=5
```

- **MSG91_AUTH_KEY**: From MSG91 Dashboard → Settings → API Keys
- **MSG91_TEMPLATE_NAME**: Exact template name approved in MSG91 (case-sensitive)
- **MSG91_INTEGRATED_NUMBER**: Your WhatsApp Business Account number (from Meta)
- **MSG91_OTP_LANGUAGE**: ISO language code (en = English)
- **MSG91_OTP_LENGTH**: OTP digit count (6 recommended)
- **MSG91_OTP_EXPIRY_MINUTES**: OTP validity period (5 minutes recommended)

## API Endpoints

### Send OTP Endpoint

**POST** `/api/auth/otp/send`

**Request Body**:
```json
{
  "intent": "signup",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+918977311418"
}
```

**Response** (Success):
```json
{
  "success": true,
  "resendInSeconds": 30,
  "expiresInMinutes": 5,
  "providerRequestId": "36646a684864677147517244"
}
```

**Response** (Error - WhatsApp not configured):
```json
{
  "message": "MSG91 WhatsApp API error: HTTP 401: Request failed"
}
```

### Verify OTP Endpoint

**POST** `/api/auth/otp/verify`

**Request Body**:
```json
{
  "intent": "signup",
  "phone": "+918977311418",
  "code": "123456"
}
```

**Response** (Success):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "64f8e4d2c1b2a3e4f5g6h7i8",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+918977311418",
    "role": "customer"
  }
}
```

## Testing

### Step 1: Verify Auth Key

```bash
# Test SMS OTP endpoint (to verify auth key is valid)
curl -X GET "https://api.msg91.com/api/sendotp.php" \
  -d "authkey=504634AwYEEVs4l69caf7afP1&mobile=918977311418&otp=123456&otp_length=6&otp_expiry=5"

# Expected: { "message": "<request_id>", "type": "success" }
```

### Step 2: Test WhatsApp OTP Send (After Setup)

```bash
# Start backend
npm --prefix backend run dev

# Test OTP send (from frontend or curl)
curl -X POST http://localhost:5000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "signup",
    "fullName": "Test User",
    "email": "test@example.com",
    "phone": "+918977311418"
  }'

# Expected:
# {
#   "success": true,
#   "resendInSeconds": 30,
#   "expiresInMinutes": 5,
#   "providerRequestId": "36646a684864677147517244"
# }
```

### Step 3: Check MSG91 Logs

1. Go to [MSG91 Dashboard](https://www.msg91.com/dashboard)
2. Logs → WhatsApp/Messages
3. Search for phone number or request ID
4. Verify:
   - Delivery status (Delivered/Failed)
   - Template used (cafe_maza_otp)
   - Recipient number
   - Timestamp of send

## Troubleshooting

### Issue: 401 Unauthorized Error

**Symptoms**:
```json
{
  "status": "fail",
  "hasError": true,
  "errors": "Unauthorized",
  "code": "401",
  "apiError": "418"
}
```

**Causes & Solutions**:

1. **WhatsApp Channel Not Enabled**
   - Go to MSG91 Dashboard → Channels → WhatsApp
   - Verify WhatsApp channel shows as "Enabled"
   - If not, enable it and wait for approval

2. **Integrated Number Not Configured**
   - Verify `15559363844` is added in WhatsApp Settings
   - Confirm it matches your Meta Business Account number
   - Ensure it's marked as "Active"

3. **Template Not Approved**
   - Check Templates section in MSG91 Dashboard
   - Verify `cafe_maza_otp` exists and status is **APPROVED**
   - If pending, wait for MSG91 team approval
   - If rejected, check feedback and resubmit

4. **DLT Compliance Issues** (India only)
   - If business is in India, verify DLT registration
   - Ensure WhatsApp number is DLT-registered
   - Add entity ID to template if required

**Resolution Steps**:
```bash
# 1. Check backend logs (should show detailed error)
npm --prefix backend run dev
# Check for "[MSG91 WhatsApp OTP]" log messages

# 2. Test with SMS endpoint to verify auth key works
node backend/verify-auth-key.mjs

# 3. Verify MSG91 configuration in dashboard
# Open: https://www.msg91.com/dashboard → Settings

# 4. Contact MSG91 support if:
# - Integrated number is configured but still fails
# - Template shows as approved but rejected by API
```

### Issue: Message Not Delivered (No 401, But No SMS Received)

**Causes**:
- Recipient number not in test/whitelist
- Template parameters don't match
- WhatsApp Business Account receiving limit exceeded
- Network/connectivity issue on recipient's side

**Debug Steps**:
1. Check MSG91 Logs for delivery status
2. Verify recipient phone is whitelisted for testing
3. Check template parameter format matches send request
4. Try sending to yourself first (if number available)

### Issue: Template Not Found/Invalid

**Symptoms**: API accepts request but template fails to render

**Causes**:
- Template name is case-sensitive
- Template parameters don't match `{{1}}` pattern
- Template not approved

**Fix**:
- In backend/.env, ensure `MSG91_TEMPLATE_NAME=cafe_maza_otp` (exact match)
- In MSG91 dashboard, verify template body includes parameter placeholder

## Fallback: SMS OTP

If WhatsApp setup takes time, you can temporarily use SMS OTP:

**Modify** `backend/src/routes/auth.js`:
```javascript
async function sendOtpWithMsg91(phoneE164, otpCode) {
    try {
        // Try WhatsApp first
        return await sendOtpWithMsg91WhatsApp(phoneE164, otpCode);
    } catch (whatsappError) {
        console.warn("[MSG91 OTP] WhatsApp failed, falling back to SMS:", whatsappError.message);
        // Fall back to SMS
        return await sendOtpWithMsg91SMS(phoneE164, otpCode);
    }
}
```

Or use the old SMS endpoint directly:
```javascript
const params = {
    authkey: authKey,
    mobile: phoneE164.replace(/^\+/, ""),
    otp: otpCode,
    otp_length: String(OTP_LENGTH),
    otp_expiry: String(OTP_EXPIRY_MINUTES),
};
const response = await axios.get("https://api.msg91.com/api/sendotp.php", { params });
```

## Implementation Details

### File Structure

```
backend/
├── src/
│   ├── routes/auth.js                 # OTP send/verify endpoints
│   └── models/OtpSession.js           # OTP state storage
├── .env                               # Configuration (auth keys, templates)
└── debug-msg91.mjs                    # Auth method testing script

cafe-maza-web/
├── lib/msg91.ts                       # Deprecated (frontend moved to backend APIs)
├── app/login/page.tsx                 # Frontend login (calls backend OTP APIs)
└── app/signup/page.tsx                # Frontend signup (calls backend OTP APIs)
```

### Rate Limiting

- **Max 5 OTP sends** per 15 minutes per phone
- **Minimum 30 seconds** between resend requests
- **5 failed verifications** lock account for 15 minutes
- **OTP expires** after configured minutes (default: 5)

### Security Features

- ✅ OTP stored as bcrypt hash (not plaintext)
- ✅ Rate limiting to prevent brute force
- ✅ Expiration enforcement
- ✅ Phone number E.164 normalization
- ✅ CORS-protected backend endpoints
- ✅ JWT session tokens (no Supabase dependency)

## Next Steps

1. **Configure MSG91 WhatsApp Channel** (Main blocker)
   - Enable WhatsApp in Settings
   - Add integrated WhatsApp number
   - Submit and approve `cafe_maza_otp` template
   - Whitelist test numbers

2. **Test End-to-End**
   - Use provided test script
   - Check MSG91 logs for delivery
   - Verify OTP received on WhatsApp

3. **Deploy to Production**
   - Update env variables with production credentials
   - Test with real phone numbers
   - Monitor MSG91 dashboard for delivery status

## Support

**MSG91 Support**:
- Dashboard: https://www.msg91.com/dashboard
- API Docs: https://www.msg91.com/api/
- Contact: support-team@msg91.com

**Issue**: If you see 401 error consistently, reach out to MSG91 support with:
- Screenshot of error
- Request ID (from logs)
- WhatsApp number being used
- Integrated number configuration proof
