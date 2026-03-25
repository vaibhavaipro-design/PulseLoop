/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  serverExternalPackages: ['file-type'],
  transpilePackages: ['react-markdown', 'remark']
}

export default nextConfig
