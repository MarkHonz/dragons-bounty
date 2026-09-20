'use client';

import { useEffect, useState } from 'react';

// False while the page is still being rendered on the server and until React has
// attached to it in the browser, true after. Used to keep a form's submit button
// disabled until then: before that the form's own JavaScript isn't running, so a
// submit would fall back to the browser's plain form submission, which puts every
// field (passwords included) into the address bar.
export const useHydrated = () => {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	return hydrated;
};
