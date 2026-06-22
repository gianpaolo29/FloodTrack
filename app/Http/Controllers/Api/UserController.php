<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

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
        ]);

        $request->user()->update($data);

        return response()->json($request->user()->fresh());
    }
}
