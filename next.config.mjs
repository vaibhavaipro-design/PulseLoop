/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  transpilePackages: ['react-markdown', 'remark'],
  experimental: {
    serverComponentsExternalPackages: ['file-type']
  }
}

export default nextConfig
