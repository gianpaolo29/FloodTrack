<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verification Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 0;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <!-- Header -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#0ea5e9,#0284c7);padding:32px 40px;text-align:center;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">FloodTrack</h1>
                        </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                        <td style="padding:36px 40px;">
                            <p style="margin:0 0 8px;color:#334155;font-size:18px;font-weight:600;">Verify your email</p>
                            <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.6;">
                                Use the code below to complete your FloodTrack registration. This code expires in 10 minutes.
                            </p>
                            <div style="text-align:center;margin:0 0 28px;">
                                <span style="display:inline-block;background-color:#f0f9ff;border:2px dashed #0ea5e9;border-radius:10px;padding:16px 36px;font-size:32px;font-weight:800;letter-spacing:8px;color:#0284c7;">{{ $code }}</span>
                            </div>
                            <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.5;">
                                If you didn't create a FloodTrack account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
                            <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; {{ date('Y') }} FloodTrack. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
