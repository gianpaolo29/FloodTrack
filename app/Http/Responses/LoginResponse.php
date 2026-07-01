<?php

namespace App\Http\Responses;

use Illuminate\Http\Request;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            $user = $request->user();

            return response()->json([
                'two_factor' => false,
                'user'       => $user,
                'role'       => $user->role,
                'redirect'   => $this->redirectPath($user->role),
            ]);
        }

        return redirect()->intended($this->redirectPath($request->user()->role));
    }

    private function redirectPath(string $role): string
    {
        return match ($role) {
            'admin'     => '/admin',
            'responder' => '/responder/dashboard',
            default     => '/dashboard',
        };
    }
}
