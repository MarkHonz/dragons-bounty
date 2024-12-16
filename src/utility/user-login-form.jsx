'use client';

import { useRef } from 'react';
import { useFormState } from 'react-dom';

import styles from './modal-launcher.module.scss';
import FormSubmit from '@/utility/form-submit';
import { userAuth } from '@/actions/user-actions';
import Link from 'next/link';
// import { useRouter } from 'next/navigation';

// formMode: login or create
export default function UserLoginForm({ formMode }) {
	const [formState, formAction] = useFormState(
		userAuth.bind(null, formMode),
		{}
	);
	const formRef = useRef(null); // Create a reference to the form element
	// const router = useRouter();

	// const toggleModal = () => {
	// 	router.push('/account');
	// };

	return (
		<form
			className={styles.form}
			action={formAction}
			formMethod="dialog"
			ref={formRef}
		>
			<fieldset>
				<legend>
					&nbsp;{formMode === 'create' ? 'Create an account' : 'Sign In'}
					&nbsp;
				</legend>

				{formMode === 'create' && (
					<>
						<label htmlFor="name">User Name:</label>
						<input id="name" name="name" type="text" />
					</>
				)}

				<label htmlFor="email">Email:</label>
				<input type="email" name="email" id="email" />

				<label htmlFor="password">Password</label>
				<input type="password" name="password" id="password" />

				<FormSubmit formMode={formMode} ref={formRef} />

				{/* <button onClick={toggleModal}>Close</button> */}

				{formMode === 'create' && (
					<Link href="/sign-in?formMode=login">
						Sign in to existing account
					</Link>
				)}
				{formMode === 'login' && (
					<Link href="/sign-in?formMode=create">Create an account</Link>
				)}
			</fieldset>
			{formState.errors &&
				formState.errors.map((error, index) => {
					return <p key={index}>{error.message}</p>;
				})}
			{formState.success && <h2>Success</h2>}
			{/* {formState.success && toggleModal()} */}
		</form>
	);
}
