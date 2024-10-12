// import styles from './page.module.scss';
import { getUsers } from '@/lib/user-db';
import DeleteButton from '@/components/delete-button';

export default async function HomePage() {
	const users = await getUsers();

	return (
		<div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
			<main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
				<h1 className="text-5xl">{"Dragon's Bounty"}</h1>
				{users &&
					users.map((user) => {
						return (
							<div key={user.id}>
								<h3 key={user.id}>{`Name: ${
									user.profile?.name ?? 'Unknown'
								} Email: ${user.email}`}</h3>
								<DeleteButton id={user.id} />
							</div>
						);
					})}
			</main>
		</div>
	);
}
