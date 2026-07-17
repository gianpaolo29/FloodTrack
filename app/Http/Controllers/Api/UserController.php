<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'name'           => 'sometimes|string|max:255',
            'contact_number' => 'sometimes|nullable|string|max:20',
            'home_address'   => 'sometimes|nullable|string|max:500',
            'home_latitude'  => 'sometimes|nullable|numeric|between:-90,90',
            'home_longitude' => 'sometimes|nullable|numeric|between:-180,180',
        ]);

        $request->user()->update($data);

        return response()->json($request->user()->fresh());
    }

    public function updateDutyStatus(Request $request)
    {
        $data = $request->validate([
            'is_on_duty' => 'required|boolean',
        ]);

        $request->user()->update($data);

        return response()->json($request->user()->fresh());
    }

    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update(['password' => $request->password]);

        return response()->json(['message' => 'Password updated successfully.']);
    }

    public function updateAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $user = $request->user();

        // Delete old avatar if exists
        if ($user->avatar) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return response()->json($user->fresh());
    }
}
