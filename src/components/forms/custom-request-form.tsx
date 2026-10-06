'use client';

import { useId, useState } from 'react';

import { submitCustomRequestAction } from '@/actions/custom-request-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	BUDGETS,
	checkCustomRequest,
	type CustomRequestErrors,
	DESCRIPTION_MAX,
	EMAIL_MAX,
	NAME_MAX,
	PHONE_MAX,
} from '@/lib/custom-request-rules';
import { useHydrated } from '@/lib/use-hydrated';

const pad = (n: number) => String(n).padStart(2, '0');
const todayKey = () => {
	const d = new Date();
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fieldClass =
	'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

// The custom-art request form. The same rules are checked here (so mistakes
// show at once) and again on the server.
export default function CustomRequestForm({
	defaultName = '',
	defaultEmail = '',
}: {
	defaultName?: string;
	defaultEmail?: string;
}) {
	const hydrated = useHydrated();
	const id = useId();
	const [form, setForm] = useState({
		name: defaultName,
		email: defaultEmail,
		phone: '',
		preferredContact: 'EMAIL',
		description: '',
		budget: '',
		neededBy: '',
		website: '',
	});
	const [errors, setErrors] = useState<CustomRequestErrors>({});
	const [message, setMessage] = useState('');
	const [sending, setSending] = useState(false);
	const [done, setDone] = useState<{ name: string; contactBy: string } | null>(null);

	const set = (field: keyof typeof form) =>
		(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
			setForm((current) => ({ ...current, [field]: event.target.value }));

	const bothGiven = form.email.trim() !== '' && form.phone.trim() !== '';

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setMessage('');
		const check = checkCustomRequest(form);
		if (!check.ok) {
			setErrors(check.errors);
			return;
		}
		setErrors({});
		setSending(true);
		try {
			const result = await submitCustomRequestAction(form);
			if (result.ok) {
				setDone({ name: result.name, contactBy: result.contactBy });
			} else {
				setErrors(result.errors);
				setMessage(result.message ?? '');
			}
		} catch (error) {
			console.error('Failed to send the request', error);
			setMessage('Something went wrong. Please try again.');
		} finally {
			setSending(false);
		}
	};

	if (done) {
		return (
			<Card className="shadow-warm-sm">
				<CardHeader>
					<CardTitle className="font-display text-2xl">Thank you!</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-2" role="status">
					<p>
						Thanks, {done.name}. Your request has been sent, and we&apos;ll be in
						touch at <span className="break-all font-semibold">{done.contactBy}</span>.
					</p>
				</CardContent>
			</Card>
		);
	}

	const err = (key: keyof CustomRequestErrors) =>
		errors[key] ? (
			<p id={`${id}-${key}-error`} className="text-sm font-medium text-destructive">
				{errors[key]}
			</p>
		) : null;
	const describedBy = (key: keyof CustomRequestErrors) =>
		errors[key] ? `${id}-${key}-error` : undefined;

	return (
		<Card className="shadow-warm-sm">
			<CardHeader>
				<CardTitle className="font-display text-2xl">Tell us about it</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor={`${id}-name`}>Name</Label>
						<Input
							id={`${id}-name`}
							value={form.name}
							onChange={set('name')}
							maxLength={NAME_MAX}
							autoComplete="name"
							aria-invalid={errors.name ? true : undefined}
							aria-describedby={describedBy('name')}
						/>
						{err('name')}
					</div>

					<fieldset className="flex flex-col gap-3">
						<legend className="mb-1 text-sm font-medium">
							How can we reach you?{' '}
							<span className="font-normal text-muted-foreground">
								(email, phone, or both)
							</span>
						</legend>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<div className="flex min-w-0 flex-col gap-1.5">
								<Label htmlFor={`${id}-email`}>Email</Label>
								<Input
									id={`${id}-email`}
									type="email"
									value={form.email}
									onChange={set('email')}
									maxLength={EMAIL_MAX}
									autoComplete="email"
									aria-invalid={errors.email || errors.contact ? true : undefined}
									aria-describedby={describedBy('email') ?? describedBy('contact')}
								/>
								{err('email')}
							</div>
							<div className="flex min-w-0 flex-col gap-1.5">
								<Label htmlFor={`${id}-phone`}>Phone</Label>
								<Input
									id={`${id}-phone`}
									type="tel"
									value={form.phone}
									onChange={set('phone')}
									maxLength={PHONE_MAX}
									autoComplete="tel"
									aria-invalid={errors.phone || errors.contact ? true : undefined}
									aria-describedby={describedBy('phone') ?? describedBy('contact')}
								/>
								{err('phone')}
							</div>
						</div>
						{err('contact')}
						{bothGiven && (
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
								<span className="text-muted-foreground">Which do you prefer?</span>
								{[
									['EMAIL', 'Email'],
									['PHONE', 'Phone'],
								].map(([value, label]) => (
									<label key={value} className="flex items-center gap-1.5">
										<input
											type="radio"
											name={`${id}-preferred`}
											value={value}
											checked={form.preferredContact === value}
											onChange={set('preferredContact')}
										/>
										{label}
									</label>
								))}
							</div>
						)}
					</fieldset>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor={`${id}-description`}>What are you looking for?</Label>
						<textarea
							id={`${id}-description`}
							value={form.description}
							onChange={set('description')}
							rows={6}
							maxLength={DESCRIPTION_MAX}
							placeholder="The kind of piece, size, colours, who it's for, any ideas or inspiration..."
							className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							aria-invalid={errors.description ? true : undefined}
							aria-describedby={describedBy('description')}
						/>
						<span className="self-end text-xs text-muted-foreground">
							{form.description.length}/{DESCRIPTION_MAX}
						</span>
						{err('description')}
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="flex min-w-0 flex-col gap-1.5">
							<Label htmlFor={`${id}-budget`}>
								Budget <span className="font-normal text-muted-foreground">(optional)</span>
							</Label>
							<select
								id={`${id}-budget`}
								value={form.budget}
								onChange={set('budget')}
								className={fieldClass}
								aria-invalid={errors.budget ? true : undefined}
								aria-describedby={describedBy('budget')}
							>
								<option value="">Choose…</option>
								{BUDGETS.map((budget) => (
									<option key={budget.value} value={budget.value}>
										{budget.label}
									</option>
								))}
							</select>
							{err('budget')}
						</div>
						<div className="flex min-w-0 flex-col gap-1.5">
							<Label htmlFor={`${id}-needed`}>
								Needed by <span className="font-normal text-muted-foreground">(optional)</span>
							</Label>
							<Input
								id={`${id}-needed`}
								type="date"
								value={form.neededBy}
								onChange={set('neededBy')}
								min={hydrated ? todayKey() : undefined}
								aria-invalid={errors.neededBy ? true : undefined}
								aria-describedby={describedBy('neededBy')}
							/>
							{err('neededBy')}
						</div>
					</div>

					{/* A trap for bots: hidden from people (and screen readers), so
					    anything typed here came from a script. */}
					<div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
						<label>
							Website
							<input
								type="text"
								tabIndex={-1}
								autoComplete="off"
								value={form.website}
								onChange={set('website')}
							/>
						</label>
					</div>

					{message && (
						<p className="text-sm font-medium text-destructive" role="alert">
							{message}
						</p>
					)}
					<Button
						type="submit"
						className="rounded-full sm:self-start"
						disabled={!hydrated || sending}
					>
						{sending ? 'Sending…' : 'Send request'}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
