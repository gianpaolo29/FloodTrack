<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FamilyGroup;
use App\Models\FamilyMember;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FamilyController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();
        $membership = FamilyMember::where('user_id', $user->id)->first();

        if (!$membership) {
            return response()->json(['message' => 'Not in a family group.'], 404);
        }

        $group = $membership->group->load(['members.user']);

        return response()->json($this->formatGroup($group, $user->id));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $user = $request->user();

        // Check if already in a group
        $existing = FamilyMember::where('user_id', $user->id)->exists();
        if ($existing) {
            return response()->json(['message' => 'You are already in a family group.'], 422);
        }

        $group = FamilyGroup::create([
            'name' => $data['name'],
            'invite_code' => strtoupper(Str::random(8)),
            'creator_id' => $user->id,
        ]);

        FamilyMember::create([
            'family_group_id' => $group->id,
            'user_id' => $user->id,
            'check_in_status' => 'unknown',
        ]);

        $group->load(['members.user']);

        return response()->json($this->formatGroup($group, $user->id), 201);
    }

    public function join(Request $request, string $code)
    {
        $user = $request->user();

        $existing = FamilyMember::where('user_id', $user->id)->exists();
        if ($existing) {
            return response()->json(['message' => 'You are already in a family group.'], 422);
        }

        $group = FamilyGroup::where('invite_code', strtoupper($code))->first();
        if (!$group) {
            return response()->json(['message' => 'Invalid invite code.'], 404);
        }

        FamilyMember::create([
            'family_group_id' => $group->id,
            'user_id' => $user->id,
            'check_in_status' => 'unknown',
        ]);

        $group->load(['members.user']);

        return response()->json($this->formatGroup($group, $user->id));
    }

    public function invite(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        // For now, just return success — email invitations can be added later
        return response()->json(['message' => 'Invitation sent.']);
    }

    public function checkIn(Request $request)
    {
        $request->validate([
            'status' => 'required|in:safe,need_help,unknown',
        ]);

        $user = $request->user();
        $membership = FamilyMember::where('user_id', $user->id)->first();

        if (!$membership) {
            return response()->json(['message' => 'Not in a family group.'], 404);
        }

        $membership->update([
            'check_in_status' => $request->status,
            'checked_in_at' => now(),
        ]);

        return response()->json(['message' => 'Check-in updated.']);
    }

    public function leave(Request $request)
    {
        $user = $request->user();
        $membership = FamilyMember::where('user_id', $user->id)->first();

        if (!$membership) {
            return response()->json(['message' => 'Not in a family group.'], 404);
        }

        $group = $membership->group;
        $membership->delete();

        // If creator left and no members remain, delete the group
        if ($group->members()->count() === 0) {
            $group->delete();
        } elseif ($group->creator_id === $user->id) {
            // Transfer ownership to first remaining member
            $newCreator = $group->members()->first();
            if ($newCreator) {
                $group->update(['creator_id' => $newCreator->user_id]);
            }
        }

        return response()->json(['message' => 'Left the family group.']);
    }

    public function removeMember(Request $request, string $memberId)
    {
        $user = $request->user();
        $membership = FamilyMember::where('user_id', $user->id)->first();

        if (!$membership) {
            return response()->json(['message' => 'Not in a family group.'], 404);
        }

        $group = $membership->group;

        // Only creator can remove members
        if ($group->creator_id !== $user->id) {
            return response()->json(['message' => 'Only the group creator can remove members.'], 403);
        }

        $target = FamilyMember::where('family_group_id', $group->id)
            ->where('user_id', $memberId)
            ->first();

        if (!$target) {
            return response()->json(['message' => 'Member not found.'], 404);
        }

        if ($target->user_id === $user->id) {
            return response()->json(['message' => 'Cannot remove yourself. Use leave instead.'], 422);
        }

        $target->delete();

        return response()->json(['message' => 'Member removed.']);
    }

    private function formatGroup(FamilyGroup $group, int $currentUserId): array
    {
        return [
            'id' => $group->id,
            'name' => $group->name,
            'invite_code' => $group->invite_code,
            'created_at' => $group->created_at->toIso8601String(),
            'members' => $group->members->map(function (FamilyMember $m) use ($group) {
                return [
                    'id' => $m->user_id,
                    'name' => $m->user->name,
                    'email' => $m->user->email,
                    'check_in_status' => $m->check_in_status,
                    'checked_in_at' => $m->checked_in_at?->toIso8601String(),
                    'is_creator' => $m->user_id === $group->creator_id,
                ];
            })->values(),
        ];
    }
}
