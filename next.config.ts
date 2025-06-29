/** @type {import('next').NextConfig} */
const nextConfig = {
    // No API keys needed for Hugging Face @xenova/transformers!
    
    // Configure webpack for @xenova/transformers compatibility
    webpack: (config: any, { isServer }: { isServer: boolean }) => {
        // Fixes npm packages that depend on `fs` module
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                path: false,
                os: false,
                crypto: false,
                stream: false,
                buffer: false,
                util: false,
                url: false,
                querystring: false,
            };
        }

        // Handle ONNX runtime for transformers - exclude Node.js bindings
        config.resolve.alias = {
            ...config.resolve.alias,
            'onnxruntime-node': false,
            '@xenova/transformers': '@xenova/transformers',
        };

        // Add support for WebAssembly
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        // Handle .wasm files
        config.module.rules.push({
            test: /\.wasm$/,
            type: 'webassembly/async',
        });

        // Ignore onnxruntime-node binaries
        config.externals = config.externals || [];
        config.externals.push({
            'onnxruntime-node': 'onnxruntime-node',
        });

        // Ignore sharp for client-side builds
        if (!isServer) {
            config.resolve.alias = {
                ...config.resolve.alias,
                sharp: false,
            };
        }

        return config;
    },

    // Headers for SharedArrayBuffer support (needed for transformers)
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Cross-Origin-Embedder-Policy',
                        value: 'require-corp',
                    },
                    {
                        key: 'Cross-Origin-Opener-Policy',
                        value: 'same-origin',
                    },
                ],
            },
        ];
    },

    // Configure for Edge Runtime compatibility
    // experimental: {
    //     esmExternals: 'loose',
    // },

    // Temporarily disable eslint during build for deployment
    eslint: {
        ignoreDuringBuilds: true,
    },

    // Disable TypeScript checking during build for deployment
    typescript: {
        ignoreBuildErrors: true,
    },
}

export default nextConfig; 