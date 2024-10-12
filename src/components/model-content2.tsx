import Image from 'next/image';

type Props = {};

export default function ModelContent2({}: Props) {
	return (
		<div>
			<Image
				src={'/src/assets/burger.jpg'}
				alt="An AI generated burger"
				width={100}
				height={100}
			/>
		</div>
	);
}
