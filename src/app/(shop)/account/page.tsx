import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPendingEmailChange } from '@/db/email-change-db';
import { getRecentOrdersByProfileId } from '@/db/orders-db';
import { countOtherSessions, getAccountOverview } from '@/db/user-db';
import { verifyAuthSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/formatters';
import { maskEmail } from '@/lib/mask-email';
import { signInUrl } from '@/lib/redirects';
import ChangeEmailDialog from './_components/change-email-dialog';
import ChangePasswordDialog from './_components/change-password-dialog';
import EditProfileDialog from './_components/edit-profile-dialog';
import PendingEmailBanner from './_components/pending-email-banner';
import ResendVerificationButton from './_components/resend-verification-button';
import SignOutOthersButton from './_components/sign-out-others-button';

const RECENT_ORDERS = 3;

const orderStatus = (order: { fulfilled: boolean; refundedAt: Date | null }) =>
	order.refundedAt ? 'Refunded' : order.fulfilled ? 'Shipped' : 'Processing';

// a label and its value, one per line
const Detail = ({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) => (
	<div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
		<dt className="w-28 shrink-0 text-sm text-muted-foreground">{label}</dt>
		<dd className="min-w-0 break-words font-medium">{children}</dd>
	</div>
);

export default async function AccountPage() {
	const { user: sessionUser, session } = await verifyAuthSession();
	if (sessionUser == null || session == null) {
		redirect(signInUrl('/account'));
	}

	const account = await getAccountOverview(sessionUser.id);
	if (account == null) redirect(signInUrl('/account'));

	const profile = account.profile;
	const [pending, otherDevices, recent] = await Promise.all([
		getPendingEmailChange(account.id),
		countOtherSessions(account.id, session.id),
		profile
			? getRecentOrdersByProfileId(profile.id, RECENT_ORDERS)
			: Promise.resolve({ orders: [], total: 0 }),
	]);

	const hasAddress = Boolean(profile?.address1);
	const profileValues = {
		name: profile?.name ?? '',
		address1: profile?.address1 ?? '',
		address2: profile?.address2 ?? '',
		city: profile?.city ?? '',
		state: profile?.state ?? '',
		zip: profile?.zip ?? '',
	};
	const memberSince = account.createdAt.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
	});

	return (
		<main className="mx-auto max-w-5xl px-5 py-10 sm:px-10">
			<header className="mb-6">
				<h1 className="font-display text-3xl font-semibold">Account</h1>
				<p className="break-all text-sm text-muted-foreground">
					Signed in as{' '}
					{profile?.name ? `${profile.name} (${account.email})` : account.email}
				</p>
			</header>

			{(!account.emailVerified || pending) && (
				<div className="mb-6 flex flex-col gap-3">
					{!account.emailVerified && (
						<div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted px-5 py-4 text-center">
							<p className="text-sm font-semibold">
								Please verify your email address ({account.email}).
							</p>
							<ResendVerificationButton />
						</div>
					)}
					{pending && (
						<PendingEmailBanner maskedNewEmail={maskEmail(pending.newEmail)} />
					)}
				</div>
			)}

			{/* grid-cols-1 (not the default "auto" column) so a very long unbroken word can't stretch the column past the screen */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
				<div className="flex min-w-0 flex-col gap-6">
					<Card className="shadow-warm-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Your details
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<dl className="flex flex-col gap-3">
								<Detail label="Name">
									{profile?.name || (
										<span className="font-normal text-muted-foreground">
											Not set
										</span>
									)}
								</Detail>
								<Detail label="Email">
									<span className="break-all">{account.email}</span>{' '}
									<Badge
										variant={account.emailVerified ? 'secondary' : 'outline'}
										className="ml-1 whitespace-nowrap align-middle"
									>
										{account.emailVerified ? 'Verified' : 'Not verified'}
									</Badge>
								</Detail>
								<Detail label="Member since">{memberSince}</Detail>
							</dl>
							<div className="flex flex-wrap gap-3">
								<EditProfileDialog
									defaultValues={profileValues}
									label="Edit profile"
								/>
								<ChangeEmailDialog currentEmail={account.email} />
							</div>
						</CardContent>
					</Card>

					<Card className="shadow-warm-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Shipping address
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							{hasAddress ? (
								<address className="flex flex-col gap-0.5 not-italic">
									{profile?.name && (
										<span className="font-medium">{profile.name}</span>
									)}
									<span className="break-words">{profile?.address1}</span>
									{profile?.address2 && (
										<span className="break-words">{profile.address2}</span>
									)}
									<span className="break-words">
										{[profile?.city, profile?.state].filter(Boolean).join(', ')}{' '}
										{profile?.zip}
									</span>
								</address>
							) : (
								<p className="text-muted-foreground">
									No address saved yet. Add one and checkout will start with it
									filled in.
								</p>
							)}
							<div>
								<EditProfileDialog
									defaultValues={profileValues}
									label={hasAddress ? 'Edit address' : 'Add address'}
								/>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="flex min-w-0 flex-col gap-6">
					<Card className="shadow-warm-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl">
								Recent orders
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
							{recent.orders.length === 0 ? (
								<p className="text-muted-foreground">
									You haven&apos;t placed any orders yet.{' '}
									<Link href="/" className="text-primary underline">
										Start shopping
									</Link>
								</p>
							) : (
								<ul className="flex flex-col divide-y divide-border">
									{recent.orders.map((order) => (
										<li
											key={order.id}
											className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0"
										>
											<div className="flex flex-col">
												<Link
													href={`/orders/${order.id}`}
													className="font-semibold text-primary underline"
												>
													Order #{order.id.slice(-8)}
												</Link>
												<span className="text-sm text-muted-foreground">
													{order.createdAt.toLocaleDateString('en-US')}
												</span>
											</div>
											<div className="flex items-center gap-3">
												<Badge
													variant={order.refundedAt ? 'destructive' : 'outline'}
												>
													{orderStatus(order)}
												</Badge>
												<span className="font-semibold">
													{formatCurrency(order.totalInCents / 100)}
												</span>
											</div>
										</li>
									))}
								</ul>
							)}
							{recent.total > 0 && (
								<Link
									href="/orders"
									className="text-sm font-semibold text-primary underline"
								>
									View all orders ({recent.total})
								</Link>
							)}
						</CardContent>
					</Card>

					<Card className="shadow-warm-sm">
						<CardHeader>
							<CardTitle className="font-display text-xl">Security</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-5">
							<div className="flex flex-col items-start gap-2">
								<p className="text-sm text-muted-foreground">
									Choose a new password for your account.
								</p>
								<ChangePasswordDialog />
							</div>
							<div className="flex flex-col items-start gap-2 border-t border-border pt-5">
								<p className="text-sm text-muted-foreground">
									{otherDevices === 0
										? "You're not signed in anywhere else."
										: otherDevices === 1
											? "You're also signed in on 1 other device."
											: `You're also signed in on ${otherDevices} other devices.`}
								</p>
								<SignOutOthersButton otherDevices={otherDevices} />
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</main>
	);
}
