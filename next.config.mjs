/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		// up to 5 product photos of up to 5 MB each in one server action call
		serverActions: { bodySizeLimit: '25mb' },
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'pub-a44b60b1f59445468f36c8dcbde3eecb.r2.dev',
				port: '',
				pathname: '**',
			},
		],
	},
};

export default nextConfig;
