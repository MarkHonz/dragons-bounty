// import DialogLauncher from '@/utility/dialog-launcher';
import ModalLauncher from '@/utility/modal-launcher';
// import ModelContent2 from '@/components/model-content2';

interface SearchParams {
	formMode?: string;
}

export default function SignInPage({
	searchParams,
}: {
	searchParams: SearchParams;
}) {
	const formMode = searchParams.formMode || 'login';

	return (
		<>
			<ModalLauncher formMode={formMode} />
			{/* <DialogLauncher prompt="Choose Now">
				<ModelContent2 />
			</DialogLauncher> */}
		</>
	);
}
