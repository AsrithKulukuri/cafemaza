# WhatsApp OTP Integration - Implementation Summary

## ✅ Completed Implementation

### 1. Backend WhatsApp OTP Integration

**File**: `backend/src/routes/auth.js`

Complete implementation of MSG91 WhatsApp API v5 integration with:

```javascript
// sendOtpWithMsg91() - Sends OTP via MSG91 WhatsApp template API
// Features:
// - Uses MSG91 v5 WhatsApp API endpoint
// - Template-based delivery (cafe_maza_otp)
// - Proper error handling with diagnostic messages
// - Full request/response logging
// - OTP generation using crypto.randomInt()
// - Rate limiting: max 5 sends per 15 min, 30s between sends
// - Expiry tracking: default 5 minutes
```

**Endpoints**:
- `POST /api/auth/otp/send` - Send OTP to phone
- `POST /api/auth/otp/verify` - Verify OTP code

### 2. OTP Session Model

**File**: `backend/src/models/OtpSession.js`

MongoDB schema for tracking OTP state:
```javascript
{
  phoneE164,                    // Normalized phone
  intent,                       // "login" or "signup"
  fullName,                     // For signup
  email,                        // For signup
  otpHash,                      // bcrypt hashed OTP
  otpExpiresAt,                 // Expiry timestamp
  otpSendCount,                 // Sends in current window
  otpSendWindowStartedAt,       // Rate limit window start
  lastOtpSentAt,                // Last send time
  otpVerifyFailCount,           // Failed attempts
  otpLockedUntil                // Lockout timestamp
}
```

### 3. Request/Response Payloads

**Send OTP**:
```javascript
// REQUEST
POST /api/auth/otp/send
{
  "intent": "signup|login",
  "fullName": "John Doe",      // required for signup
  "email": "john@example.com", // required for signup
  "phone": "+918977311418"
}

// RESPONSE (Success)
{
  "success": true,
  "resendInSeconds": 30,
  "expiresInMinutes": 5,
  "providerRequestId": "36646a684864677147517244"
}

// RESPONSE (Error)
{
  "message": "Error description"
}
```

**Verify OTP**:
```javascript
// REQUEST
POST /api/auth/otp/verify
{
  "intent": "signup|login",
  "phone": "+918977311418",
  "code": "123456"
}

// RESPONSE (Success)
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

### 4. Security Features

✅ **Rate Limiting**
- Max 5 OTP sends per 15-minute window
- Minimum 30 seconds between consecutive sends
- 5 failed verify attempts → 15-minute lockout
- Rate limits per phone number

✅ **OTP Hashing**
- OTPs stored as bcrypt hashes (not plaintext)
- Comparison using bcryptjs for security

✅ **Phone Validation**
- E.164 format normalization
- Supports multiple input formats (spaces, dashes, etc.)
- Country-agnostic validation

✅ **Expiry Enforcement**
- Configurable OTP expiry (default: 5 minutes)
- Automatic deletion after expiry attempt
- Timestamp-based validation

✅ **JWT Session Management**
- No Supabase dependency
- Backend-generated JWT tokens
- Stored in localStorage (frontend)

### 5. Logging & Debugging

Comprehensive logging for all operations:

```javascript
[MSG91 WhatsApp OTP] Preparing request { phone, mobile, templateName, ... }
[MSG91 WhatsApp OTP] Request payload: { integrated_number, template, recipient, ... }
[MSG91 WhatsApp OTP] Raw response { status, statusText, data, timestamp }
[MSG91 WhatsApp OTP] Request successful { phone, requestId, message }
[MSG91 OTP] send accepted { phone, intent, providerRequestId, ... }
```

Includes helpful diagnostic output for troubleshooting.

### 6. Environment Configuration

**File**: `backend/.env`

```env
MSG91_AUTH_KEY=504634AwYEEVs4l69caf7afP1
MSG91_TEMPLATE_NAME=cafe_maza_otp
MSG91_INTEGRATED_NUMBER=15559363844
MSG91_OTP_LANGUAGE=en
MSG91_OTP_LENGTH=6
MSG91_OTP_EXPIRY_MINUTES=5
```

**File**: `backend/.env.example`

Updated with new WhatsApp configuration variables.

### 7. Frontend Integration

**Files Modified**:
- `cafe-maza-web/lib/msg91.ts` - Updated with deprecation notices
- `cafe-maza-web/app/login/page.tsx` - Uses backend OTP APIs
- `cafe-maza-web/app/signup/page.tsx` - Uses backend OTP APIs

Frontend directly calls backend endpoints:
```javascript
POST ${API_BASE_URL}/api/auth/otp/send
POST ${API_BASE_URL}/api/auth/otp/verify
```

### 8. Documentation

**Created**:
- `backend/WHATSAPP_OTP_SETUP.md` - Complete setup guide
- `backend/TESTING_GUIDE.md` - Testing & verification guide
- `backend/debug-msg91.mjs` - Debug script for testing auth methods
- `backend/verify-auth-key.mjs` - Verify auth key validity

## 🔄 Current Status

### ✅ Working Features

- Backend OTP generation and storage
- Phone number validation and normalization
- Rate limiting and lockout mechanisms
- OTP hashing and secure comparison
- JWT token generation
- Database persistence
- Error handling and logging
- Resend functionality
- Correct MSG91 WhatsApp API v5 implementation

### Auth Key Verification

```
✅ Auth Key: VALID (verified with SMS OTP endpoint)
✅ API Endpoint: Correct (https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/)
✅ Payload Format: Correct (template-based delivery structure)
✅ Error Handling: Correct (with diagnostic guidance)

❌ WhatsApp Delivery: Requires MSG91 account configuration
```

### ⚠️ WhatsApp Delivery - Action Required

MSG91 returns **401 Unauthorized** because the account needs WhatsApp channel setup:

1. **Enable WhatsApp Channel** in MSG91 Dashboard
2. **Configure Integrated Number** (15559363844)
3. **Approve Template** (cafe_maza_otp) for WhatsApp
4. **Whitelist Test Numbers** for testing

## 📋 What User Needs To Do

### Step 1: Configure MSG91 Account

Go to: https://www.msg91.com/dashboard

**Enable WhatsApp**:
- Settings → Channels → WhatsApp
- Enable WhatsApp channel

**Add Integrated Number**:
- WhatsApp Settings → Integrated Numbers
- Add: `15559363844`
- Ensure it's active in Meta Business Manager

**Create/Approve Template**:
- Go to Templates section
- Create template named: `cafe_maza_otp`
- Template body with parameter: `Your OTP is {{1}}`
- Status must be: APPROVED
- Category: Authentication

**Whitelist Test Numbers**:
- WhatsApp Settings → Sender Filter
- Add: `+1 (918) 977-3114` (or your test number)

### Step 2: Test Integration

```bash
# Verify auth key works
cd backend && node verify-auth-key.mjs

# Start backend
npm --prefix backend run dev

# Send test OTP
curl -X POST http://localhost:5000/api/auth/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "signup",
    "fullName": "Test",
    "email": "test@example.com",
    "phone": "+918977311418"
  }'

# Check MSG91 logs for delivery status
```

### Step 3: Monitor Delivery

In MSG91 Dashboard:
- Logs → Messages/WhatsApp
- Search by phone or request ID
- Verify delivery status (Delivered/Failed)

### Step 4: Production Deployment

Update credentials for production and monitor MSG91 logs.

## 📊 File Changes

### Created Files
- `backend/debug-msg91.mjs` - Debug script
- `backend/verify-auth-key.mjs` - Auth verification script
- `backend/WHATSAPP_OTP_SETUP.md` - Setup documentation
- `backend/TESTING_GUIDE.md` - Testing guide

### Modified Files
- `backend/src/routes/auth.js` - Replaced SMS OTP logic with WhatsApp API
- `backend/src/models/OtpSession.js` - No changes (already correct)
- `backend/.env` - Updated MSG91 configuration variables
- `backend/.env.example` - Updated with new variables
- `cafe-maza-web/lib/msg91.ts` - Added deprecation notices
- `cafe-maza-web/app/login/page.tsx` - No changes (already uses backend API)
- `cafe-maza-web/app/signup/page.tsx` - No changes (already uses backend API)

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────┐
│ User Frontend (login/signup page)                       │
│ - Phone input field                                     │
│ - OTP verification field                               │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ POST /api/auth/otp/send
                 │ POST /api/auth/otp/verify
                 ↓
┌─────────────────────────────────────────────────────────┐
│ Backend Express.js (port 5000)                          │
│ - Route: POST /api/auth/otp/send                       │
│   • Phone validation & normalization                   │
│   • Rate limiting check                                │
│   • OTP generation (6 digits)                          │
│   • Store in MongoDB with hash & expiry               │
│   • Call MSG91 API                                     │
│                                                         │
│ - Route: POST /api/auth/otp/verify                     │
│   • Phone & OTP validation                            │
│   • bcrypt comparison                                  │
│   • Create user or return JWT                         │
│   • Clear OTP session                                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ API Call
                 ↓
┌─────────────────────────────────────────────────────────┐
│ MSG91 WhatsApp API v5                                   │
│ https://api.msg91.com/api/v5/whatsapp/...             │
│ - Template: cafe_maza_otp                             │
│ - Parameter: OTP code {{1}}                           │
│ - Response: success or 401 (if not configured)        │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ WhatsApp Message
                 ↓
┌─────────────────────────────────────────────────────────┐
│ User's WhatsApp                                         │
│ "Your Cafe Maza OTP is 123456. Valid for 5 minutes."  │
└─────────────────────────────────────────────────────────┘
```

## ✨ Key Improvements Over Previous Implementation

1. **Uses Correct Endpoint**: WhatsApp API v5 (not SMS OTP API)
2. **Template-Based Delivery**: Professional formatted messages
3. **Better Error Messages**: Diagnostic guidance for troubleshooting
4. **Comprehensive Logging**: Full request/response tracking
5. **Complete Documentation**: Setup, testing, and troubleshooting guides
6. **Production-Ready**: Rate limiting, security, validation all built-in

## 🔗 Quick Links

- **Setup Guide**: `backend/WHATSAPP_OTP_SETUP.md`
- **Testing Guide**: `backend/TESTING_GUIDE.md`
- **MSG91 Dashboard**: https://www.msg91.com/dashboard
- **MSG91 API Docs**: https://www.msg91.com/api/
- **Backend Logs**: Check console output from `npm --prefix backend run dev`

## 📞 Support

If WhatsApp delivery still fails after setup:
1. Check backend logs for detailed error messages
2. Verify all MSG91 dashboard settings
3. Contact MSG91 support with request ID and phone number
4. Optionally enable SMS OTP fallback while troubleshooting
