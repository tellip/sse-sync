const createConfig = (input, outputDir, additionalExternals = []) => ({
    input,
    output: [
        {file: `${outputDir}/index.js`, format: 'esm', sourcemap: true},
        {file: `${outputDir}/index.cjs`, format: 'cjs', sourcemap: true, exports: 'named'},
    ],
    external: ['koa', 'assert', ...additionalExternals],  // 添加 Node 内置模块
});

export default [
    createConfig('src/server/index.js', 'dist/server'),
    createConfig('src/client/index.js', 'dist/client'),
];