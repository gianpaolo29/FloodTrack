<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Traits\HasPeriodStats;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    use HasPeriodStats;

    public function index(Request $request): Response
    {
        [$from, $to, $period] = $this->parsePeriod($request);
        [$prevFrom, $prevTo, $trendLabel, $periodLabel] = $this->comparisonPeriod($period, $from, $to);

        $curTotal = $this->scopeByPeriod(User::where('role', 'resident'), $from, $to)->count();
        $prevTotal = User::where('role', 'resident')->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $curNew = $this->scopeByPeriod(User::where('role', 'resident'), $from, $to)->count();
        $prevNew = User::where('role', 'resident')->whereBetween('created_at', [$prevFrom, $prevTo])->count();

        $stats = [
            'total'        => $curTotal,
            'new'          => $curNew,
            'with_address' => User::where('role', 'resident')->whereNotNull('home_address')->count(),
            'verified'     => User::where('role', 'resident')->whereNotNull('email_verified_at')->count(),
        ];

        $trends = [
            'total'        => $this->calcTrend($curTotal, $prevTotal),
            'new'          => $this->calcTrend($curNew, $prevNew),
            'label'        => $trendLabel,
            'period_label' => $periodLabel,
        ];

        $users = User::where('role', 'resident')
            ->when($request->search, fn ($q) => $q->where(function ($q2) use ($request) {
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhere('email', 'like', "%{$request->search}%");
            }))
            ->withCount([
                'reports',
                'assignedReports as active_assignments' => fn ($q) => $q->whereIn('status', ['assigned']),
            ])
            ->latest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/users/index', [
            'users'       => $users,
            'filters'     => $request->only(['search']),
            'stats'       => $stats,
            'trends'      => $trends,
            'period'      => $period,
            'custom_from' => $request->get('from'),
            'custom_to'   => $request->get('to'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'           => 'required|string|max:255|unique:users,name',
            'email'          => 'required|email|unique:users,email',
            'password'       => ['required', Password::defaults()],
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/', 'unique:users,contact_number'],
            'home_address'   => 'nullable|string|max:500',
            'home_latitude'  => 'nullable|numeric|between:-90,90',
            'home_longitude' => 'nullable|numeric|between:-180,180',
        ], [
            'name.unique'           => 'A user with this name already exists.',
            'contact_number.regex'  => 'Contact number must start with 09 followed by 9 digits.',
            'contact_number.unique' => 'This contact number is already in use.',
        ]);

        $validated['password'] = Hash::make($validated['password']);
        $validated['email_verified_at'] = now();
        $validated['role'] = 'resident';

        User::create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resident created.']);

        return back();
    }

    public function update(User $user, Request $request): RedirectResponse
    {
        if ($user->role === 'admin') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Cannot edit admin users.']);
            return back();
        }

        $validated = $request->validate([
            'name'           => "required|string|max:255|unique:users,name,{$user->id}",
            'email'          => "required|email|unique:users,email,{$user->id}",
            'contact_number' => ['nullable', 'regex:/^09\d{9}$/', "unique:users,contact_number,{$user->id}"],
            'password'       => ['nullable', Password::defaults()],
            'home_address'   => 'nullable|string|max:500',
            'home_latitude'  => 'nullable|numeric|between:-90,90',
            'home_longitude' => 'nullable|numeric|between:-180,180',
        ], [
            'name.unique'           => 'A user with this name already exists.',
            'contact_number.regex'  => 'Contact number must start with 09 followed by 9 digits.',
            'contact_number.unique' => 'This contact number is already in use.',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Resident updated.']);

        return back();
    }

    public function updateRole(User $user, Request $request): RedirectResponse
    {
        $request->validate([
            'role' => 'required|in:resident,responder',
        ]);

        $user->update(['role' => $request->role]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'User role updated.']);

        return back();
    }

    public function destroy(User $user): RedirectResponse
    {
        if ($user->role === 'admin') {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Cannot delete admin users.']);
            return back();
        }

        $name = $user->name;

        $user->notifications()->delete();
        $user->tokens()->delete();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "User \"{$name}\" has been deleted."]);

        return back();
    }

    public function bulkAction(Request $request): RedirectResponse
    {
        $request->validate([
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer|exists:users,id',
            'action' => 'required|in:delete,make_resident,make_responder',
        ]);

        $users = User::whereIn('id', $request->ids)->where('role', '!=', 'admin')->get();
        $count = 0;

        foreach ($users as $user) {
            switch ($request->action) {
                case 'delete':
                    $user->notifications()->delete();
                    $user->tokens()->delete();
                    if ($user->avatar) {
                        Storage::disk('public')->delete($user->avatar);
                    }
                    $user->delete();
                    $count++;
                    break;
                case 'make_resident':
                    $user->update(['role' => 'resident']);
                    $count++;
                    break;
                case 'make_responder':
                    $user->update(['role' => 'responder']);
                    $count++;
                    break;
            }
        }

        $label = match ($request->action) {
            'delete'         => 'deleted',
            'make_resident'  => 'set to resident',
            'make_responder' => 'set to responder',
        };

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} user(s) {$label}."]);

        return back();
    }
}
