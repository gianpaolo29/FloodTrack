<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WeatherService;
use Illuminate\Http\Request;

class WeatherController extends Controller
{
    public function current(Request $request, WeatherService $weather)
    {
        $data = $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lon' => 'required|numeric|between:-180,180',
        ]);

        return response()->json([
            'current'  => $weather->current($data['lat'], $data['lon']),
            'alerts'   => $weather->alerts($data['lat'], $data['lon']),
            'forecast' => $weather->dailyForecast($data['lat'], $data['lon']),
        ]);
    }
}
