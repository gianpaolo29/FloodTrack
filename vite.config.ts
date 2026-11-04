import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild, command }) => ({
    server: {
        host: 'localhost',
        https: false,
        hmr: {
            host: 'localhost',
            protocol: 'ws',
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes('apexcharts') || id.includes('react-apexcharts')) return 'apexcharts';
                    if (id.includes('leaflet')) return 'leaflet';
                    if (id.includes('socket.io')) return 'socketio';
                    if (id.includes('framer-motion') || id.includes('motion/react')) return 'motion';
                    if (id.includes('@react-google-maps')) return 'google-maps';
                },
            },
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            detectTls: false,
        }),
        inertia({
            ssr: command === 'build',
        }),
        react({
            babel: {
                plugins: ['babel-plugin-react-compiler'],
            },
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ],
}));
