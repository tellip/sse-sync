const createConfig = (input, outputDir, name) => ({
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
    external: ['koa']                // 不打包 koa

});

export default [
    createConfig('src/server/index.js', 'dist/server', 'server'),
    createConfig('src/client/index.js', 'dist/client', 'client'),
];