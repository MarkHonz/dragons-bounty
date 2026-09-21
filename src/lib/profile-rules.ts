// The rules for the details on the Account page, shared by the form (for quick
// feedback) and the server action (which is the one that counts).

export type ProfileInput = {
	name: string;
	address1: string;
	address2: string;
	city: string;
	state: string;
	zip: string;
};

export const MAX_FIELD_LENGTH = 100;

const clean = (value: unknown) =>
	typeof value === 'string' ? value.trim() : '';

export const cleanProfile = (
	raw: Partial<Record<keyof ProfileInput, unknown>>
) => ({
	name: clean(raw.name),
	address1: clean(raw.address1),
	address2: clean(raw.address2),
	city: clean(raw.city),
	state: clean(raw.state),
	zip: clean(raw.zip),
});

// True when none of the address fields has anything in it.
export const isAddressBlank = (input: ProfileInput) =>
	!input.address1 &&
	!input.address2 &&
	!input.city &&
	!input.state &&
	!input.zip;

// What is wrong with these details (already cleaned), as messages; empty when fine.
// The name is required. The address is optional, but all or nothing: either every
// part of it (line 2 aside) or none.
export const checkProfile = (input: ProfileInput): string[] => {
	const errors: string[] = [];
	if (input.name.length < 2) errors.push('Name must be at least 2 characters');
	for (const [label, value] of Object.entries(input)) {
		if (value.length > MAX_FIELD_LENGTH) {
			errors.push(`${label === 'address1' ? 'Address' : label} is too long`);
		}
	}
	if (!isAddressBlank(input)) {
		if (input.address1.length < 2) errors.push('Address is required');
		if (input.city.length < 2) errors.push('City is required');
		if (input.state.length < 2) errors.push('State is required');
		if (input.zip.length < 5) errors.push('Zip is required');
	}
	return errors;
};
