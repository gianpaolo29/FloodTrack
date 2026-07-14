<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'first_name'     => ['required', 'string', 'max:255'],
            'last_name'      => ['required', 'string', 'max:255'],
            'email'          => $this->emailRules(),
            'password'       => $this->passwordRules(),
            'role'           => ['nullable', 'in:resident,responder'],
            'contact_number' => ['nullable', 'string', 'max:20'],
        ])->validate();

        return User::create([
            'name'           => trim($input['first_name'].' '.$input['last_name']),
            'email'          => $input['email'],
            'password'       => $input['password'],
            'role'           => $input['role'] ?? 'resident',
            'contact_number' => $input['contact_number'] ?? null,
        ]);
    }
}
