'use client';

import { useFormStatus } from 'react-dom';
import { forwardRef } from 'react';

interface FormSubmitProps {
	formMode: 'login' | 'create';
}

const FormSubmit = forwardRef<HTMLButtonElement, FormSubmitProps>(
	function FormSubmit({ formMode }, ref) {
		const { pending } = useFormStatus();

		return (
			<>
				{formMode === 'login' && (
					<button
						type="submit"
						disabled={pending}
						ref={ref}
						// onSubmit={toggleModal}
						// onClick={toggleModal}
					>
						{pending ? 'Submitting...' : 'Sign In'}
					</button>
				)}
				{formMode === 'create' && (
					<button
						type="submit"
						disabled={pending}
						ref={ref}
						// onSubmit={toggleModal}
						// onClick={toggleModal}
					>
						{pending ? 'Submitting...' : 'Create Account'}
					</button>
				)}
			</>
		);
	}
);

export default FormSubmit;
