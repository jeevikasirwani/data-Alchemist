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
            };
        }

        // Handle ONNX runtime for transformers
        config.resolve.alias = {
            ...config.resolve.alias,
            '@xenova/transformers': '@xenova/transformers',
        };

        // Add support for WebAssembly
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
        };

        // Handle .wasm files
        config.module.rules.push({
            test: /\.wasm$/,
            type: 'webassembly/async',
        });

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
}

export default nextConfig; 