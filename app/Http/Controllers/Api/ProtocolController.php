<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Protocol;

class ProtocolController extends Controller
{
    public function index()
    {
        $protocols = Protocol::orderBy('sort_order')->get();

        return response()->json($protocols->map(fn ($p) => [
            'id'         => $p->hazard_type,
            'hazard'     => $p->hazard_label,
            'icon'       => $p->icon,
            'color'      => $p->color,
            'safety_tip' => $p->safety_tip,
            'steps'      => $p->steps,
        ]));
    }
}
