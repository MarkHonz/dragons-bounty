'use client';

// A date and time in the reader's own time zone. The server formats in its own
// zone, so the two can differ; suppressHydrationWarning keeps React from
// complaining about that.
export default function LocalTime({ value }: { value: Date | string }) {
	const date = new Date(value);
	return (
		<time dateTime={date.toISOString()} suppressHydrationWarning>
			{date.toLocaleString()}
		</time>
	);
}
