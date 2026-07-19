<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'first_name'     => 'required|string|max:255',
            'last_name'      => 'required|string|max:255',
            'email'          => 'required|email|unique:users',
            'password'       => 'required|string|min:8|max:16|confirmed',
            'role'           => 'required|in:resident,responder',
            'contact_number' => 'nullable|string|max:20',
            'home_latitude'  => 'nullable|numeric|between:-90,90',
            'home_longitude' => 'nullable|numeric|between:-180,180',
            'home_address'   => 'nullable|string|max:500',
        ]);

        $data['name'] = trim($data['first_name'].' '.$data['last_name']);
        unset($data['first_name'], $data['last_name']);

        $user  = User::create($data);
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user'           => $user,
            'token'          => $token,
            'role'           => $user->role,
            'permissions'    => $user->permissions(),
            'needs_location' => is_null($user->home_latitude) || is_null($user->home_longitude),
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        // Revoke previous tokens for this device to prevent token accumulation
        $user->tokens()->delete();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'user'           => $user,
            'token'          => $token,
            'role'           => $user->role,
            'permissions'    => $user->permissions(),
            'needs_location' => is_null($user->home_latitude) || is_null($user->home_longitude),
            'redirect'       => match ($user->role) {
                'admin'     => '/admin',
                'responder' => '/responder/dashboard',
                'resident'  => '/dashboard',
            },
        ]);
    }

    public function checkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        return response()->json([
            'exists' => User::where('email', $request->email)->exists(),
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'email'    => 'required|email|exists:users,email',
            'password' => 'required|string|min:8|max:16',
        ]);

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => Hash::make($request->password)]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password reset successfully.']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
