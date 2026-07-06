<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/settings/index', [
            'settings' => Setting::allGrouped(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'settings'   => 'required|array',
            'settings.*' => 'nullable|string|max:500',
        ]);

        foreach ($request->settings as $key => $value) {
            $setting = Setting::where('key', $key)->first();

            if (! $setting) {
                continue;
            }

            // Convert frontend values to proper storage format
            $storeValue = match ($setting->type) {
                'boolean' => in_array($value, ['1', 'true', true], true) ? '1' : '0',
                default   => (string) $value,
            };

            $setting->update(['value' => $storeValue]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Settings saved.']);

        return back();
    }
}
