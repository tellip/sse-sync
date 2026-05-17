import resolve from '@rollup/plugin-node-resolve';

const createConfig = (input, outputDir, externals = []) => ({
    input,
    output: [
        {
            file: `${outputDir}/index.js`,
            format: 'esm',
            sourcemap: true,
        },
        {
            file: `${outputDir}/index.cjs`,
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
        },
    ],
    external: externals,
    plugins: [resolve()],
});

export default [
    createConfig('src/server/index.js', 'dist/server', ['koa', 'assert']),
    createConfig('src/client/index.js', 'dist/client', []),
];