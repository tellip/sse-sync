import resolve from '@rollup/plugin-node-resolve';

export default [
    {
        input: 'src/server.js',
        output: {file: 'dist/server.js', format: 'esm', sourcemap: true},
        external: ['assert', 'better-sse'],
        plugins: [resolve()],
    },
    {
        input: 'src/client.js',
        output: {file: 'dist/client.js', format: 'esm', sourcemap: true},
        external: ['tiny-invariant', '@microsoft/fetch-event-source'],
        plugins: [resolve()],
    }
];