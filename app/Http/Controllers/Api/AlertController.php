<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function index()
    {
        $alerts = Alert::where(function ($q) {
            $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
        })
        ->orderByDesc('is_critical')
        ->latest()
        ->get();

        return response()->json($alerts);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'title'      => 'required|string|max:255',
            'body'       => 'required|string',
            'type'       => 'required|in:advisory,update,critical',
            'is_critical' => 'boolean',
            'expires_at' => 'nullable|date|after:now',
        ]);

        $alert = Alert::create([
            ...$data,
            'created_by' => $request->user()->id,
        ]);

        return response()->json($alert, 201);
    }
}
