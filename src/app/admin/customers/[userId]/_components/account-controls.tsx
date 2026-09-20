'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { setUserRoleAction, userDeleteAction } from '@/actions/user-actions';
import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Props = {
	userId: string;
	label: string;
	isAdmin: boolean;
	emailVerified: boolean;
	// the signed-in admin is looking at their own account
	isSelf: boolean;
	hasOrders: boolean;
};

// Role and delete controls for one customer. The server enforces every rule;
// the reasons shown here just explain why a button is unavailable.
export default function AccountControls({
	userId,
	label,
	isAdmin,
	emailVerified,
	isSelf,
	hasOrders,
}: Props) {
	const router = useRouter();
	const [roleOpen, setRoleOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const roleReason = isSelf
		? "This is your own account. You can't change your own role; ask another admin."
		: !isAdmin && !emailVerified
			? "Their email address isn't verified, so they can't be made an admin."
			: null;
	const deleteReason = isSelf
		? "You can't delete your own account."
		: isAdmin
			? "Admins can't be deleted. Remove their admin access first."
			: hasOrders
				? "They have orders, so they can't be deleted. Their order history has to stay."
				: null;

	return (
		<div className="space-y-6 border-t border-border pt-4">
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-3">
					<span className="text-sm text-muted-foreground">Role</span>
					<Badge variant={isAdmin ? 'default' : 'outline'}>
						{isAdmin ? 'Admin' : 'Customer'}
					</Badge>
					<Badge variant={emailVerified ? 'secondary' : 'outline'}>
						{emailVerified ? 'Email verified' : 'Email not verified'}
					</Badge>
				</div>
				<Button
					type="button"
					variant={isAdmin ? 'outline' : 'default'}
					className="rounded-full"
					disabled={roleReason !== null}
					onClick={() => setRoleOpen(true)}
				>
					{isAdmin ? 'Remove admin access' : 'Make admin'}
				</Button>
				{roleReason && (
					<p className="text-sm text-muted-foreground">{roleReason}</p>
				)}
			</div>

			<div className="space-y-2">
				<Button
					type="button"
					variant="destructive"
					className="rounded-full"
					disabled={deleteReason !== null}
					onClick={() => setDeleteOpen(true)}
				>
					Delete user
				</Button>
				{deleteReason && (
					<p className="text-sm text-muted-foreground">{deleteReason}</p>
				)}
			</div>

			<ConfirmDeleteDialog
				open={roleOpen}
				onOpenChange={setRoleOpen}
				title={
					isAdmin
						? `Remove admin access for ${label}?`
						: `Make ${label} an admin?`
				}
				description={
					isAdmin
						? 'They will lose access to the admin section the next time they click anything. Their account and orders are not affected.'
						: 'Admins can see every customer and order, refund orders, and change products, categories and other admins. Only do this for someone you trust.'
				}
				confirmLabel={isAdmin ? 'Remove admin access' : 'Make admin'}
				pendingLabel="Saving…"
				confirmVariant={isAdmin ? 'destructive' : 'default'}
				onConfirm={async () => {
					const result = await setUserRoleAction(
						userId,
						isAdmin ? 'USER' : 'ADMIN'
					);
					if (!result.success) return result.errors.join(' ');
					router.refresh();
					return null;
				}}
			/>
			<ConfirmDeleteDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={`Delete ${label}?`}
				description="This permanently deletes their account, cart and saved address. This can't be undone."
				onConfirm={async () => {
					const result = await userDeleteAction(userId);
					if (!result.success) return result.errors.join(' ');
					router.push('/admin/customers');
					router.refresh();
					return null;
				}}
			/>
		</div>
	);
}
