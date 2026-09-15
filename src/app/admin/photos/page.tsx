import React from 'react';
import { getPhotos } from '@/db/photos-db';
import { addPhotoAction, deletePhotoAction } from '@/actions/photo-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default async function AdminPhotosPage() {
	const photos = await getPhotos();

	return (
		<main className="mx-auto max-w-5xl">
			<header className="mb-6">
				<h1 className="font-display text-3xl font-semibold">Photo Gallery</h1>
			</header>

			<Card className="mb-6 shadow-warm-sm">
				<CardHeader>
					<CardTitle className="font-display text-xl">Add Photo</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						action={addPhotoAction}
						className="grid grid-cols-1 gap-3 sm:grid-cols-3"
					>
						<div className="flex flex-col gap-1.5 sm:col-span-2">
							<Label htmlFor="url">Image URL</Label>
							<Input
								id="url"
								name="url"
								placeholder="Full image URL (https://...)"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="caption">Caption</Label>
							<Input id="caption" name="caption" placeholder="Optional" />
						</div>
						<div className="flex flex-col gap-1.5">
							<Label htmlFor="key">S3 Key</Label>
							<Input id="key" name="key" placeholder="Optional" />
						</div>
						<div className="sm:col-span-3">
							<Button type="submit" className="mt-2 rounded-full">
								Add Photo
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card className="shadow-warm-sm">
				<CardHeader>
					<CardTitle className="font-display text-xl">
						Existing Photos
					</CardTitle>
				</CardHeader>
				<CardContent>
					{photos.length === 0 ? (
						<p className="text-muted-foreground">No photos yet.</p>
					) : (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
							{photos.map((p) => (
								<div
									key={p.id}
									className="overflow-hidden rounded-2xl border border-border bg-card shadow-warm-sm"
								>
									<div className="h-40 w-full bg-muted">
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img
											src={p.url}
											alt={p.caption ?? 'photo'}
											className="h-full w-full object-cover"
										/>
									</div>
									<div className="p-3">
										<p className="mb-2 break-words text-sm text-muted-foreground">
											{p.caption ?? p.key ?? p.url}
										</p>
										<form action={deletePhotoAction}>
											<input type="hidden" name="id" value={p.id} />
											<Button
												type="submit"
												variant="destructive"
												size="sm"
												className="rounded-full"
											>
												Delete
											</Button>
										</form>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</main>
	);
}
