<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\EmailOtp;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class EmailOtpController extends Controller
{
    public function send(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $email = $request->input('email');

        // Delete previous OTPs for this email
        EmailOtp::where('email', $email)->delete();

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        EmailOtp::create([
            'email'      => $email,
            'code'       => $code,
            'expires_at' => now()->addMinutes(10),
        ]);

        Mail::to($email)->send(new OtpMail($code));

        return response()->json(['message' => 'OTP sent.']);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $email = $request->input('email');

        $otp = EmailOtp::where('email', $email)
            ->where('code', $request->input('otp'))
            ->where('expires_at', '>', now())
            ->first();

        if (! $otp) {
            return response()->json(['message' => 'Invalid or expired code.'], 422);
        }

        // Mark user email as verified
        User::where('email', $email)->update(['email_verified_at' => now()]);

        // Clean up
        EmailOtp::where('email', $email)->delete();

        return response()->json(['message' => 'Email verified.']);
    }
}
