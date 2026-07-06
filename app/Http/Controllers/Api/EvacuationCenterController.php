<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EvacuationCenter;

class EvacuationCenterController extends Controller
{
    public function index()
    {
        $centers = EvacuationCenter::where('is_active', true)
            ->orderBy('name')
            ->get();

        return response()->json($centers);
    }
}
