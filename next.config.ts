/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        HUGGING_FACE_API_KEY: process.env.HUGGING_FACE_API_KEY,
        HUGGING_FACE_MODEL: process.env.HUGGING_FACE_MODEL,
    },
}

export default nextConfig; 