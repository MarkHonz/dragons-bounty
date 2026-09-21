'use client';

import { useState } from 'react';

import { userUpdateProfile } from '@/actions/user-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	checkProfile,
	cleanProfile,
	MAX_FIELD_LENGTH,
	ProfileInput,
} from '@/lib/profile-rules';
import { useHydrated } from '@/lib/use-hydrated';

// The fields of the profile, in the order they are shown
const FIELDS: {
	name: keyof ProfileInput;
	label: string;
	placeholder: string;
}[] = [
	{ name: 'name', label: 'Name', placeholder: 'name' },
	{ name: 'address1', label: 'Address 1', placeholder: 'address1' },
	{ name: 'address2', label: 'Address 2', placeholder: 'address2' },
	{ name: 'city', label: 'City', placeholder: 'city' },
	{ name: 'state', label: 'State', placeholder: 'state' },
	{ name: 'zip', label: 'Zip Code', placeholder: 'zip' },
];

// The name and shipping address, for the Account page's Edit dialog. The name is
// required; the address is optional but all-or-nothing (leave it blank to clear it).
export default function EditProfileForm({
	defaultValues,
	onSaved,
}: {
	defaultValues: ProfileInput;
	onSaved?: () => void;
}) {
	// keeps Save disabled until the form's JavaScript is running
	const hydrated = useHydrated();
	const [values, setValues] = useState<ProfileInput>(defaultValues);
	const [errors, setErrors] = useState<string[]>([]);
	const [saving, setSaving] = useState(false);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const details = cleanProfile(values);
		const problems = checkProfile(details);
		if (problems.length > 0) {
			setErrors(problems);
			return;
		}
		const formData = new FormData();
		Object.entries(details).forEach(([key, value]) =>
			formData.append(key, value)
		);
		setSaving(true);
		setErrors([]);
		const result = await userUpdateProfile({}, formData);
		setSaving(false);
		if (!result.success) {
			setErrors(result.errors);
			return;
		}
		onSaved?.();
	};

	return (
		<form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
			{FIELDS.map((field) => (
				<div key={field.name} className="flex flex-col gap-1.5">
					<Label htmlFor={`profile-${field.name}`} className="pl-2">
						{field.label}
					</Label>
					<Input
						id={`profile-${field.name}`}
						name={field.name}
						placeholder={field.placeholder}
						type="text"
						maxLength={MAX_FIELD_LENGTH}
						value={values[field.name]}
						onChange={(event) =>
							setValues((current) => ({
								...current,
								[field.name]: event.target.value,
							}))
						}
					/>
				</div>
			))}
			<p className="pl-2 text-xs text-muted-foreground">
				Your address is optional. Fill in all of it (line 2 aside) or leave it
				blank.
			</p>
			{errors.length > 0 && (
				<div className="text-sm font-medium text-destructive" role="alert">
					{errors.map((error) => (
						<p key={error}>{error}</p>
					))}
				</div>
			)}
			<Button
				type="submit"
				className="rounded-full"
				disabled={!hydrated || saving}
			>
				{saving ? 'Saving...' : 'Save'}
			</Button>
		</form>
	);
}
