import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/index.js',
    format: 'cjs',
    plugins: [
        resolve(),
        babel({
            babelrc: false,
            exclude: 'node_modules/**',
            presets: ['flow'],
            plugins: [
                'transform-class-properties',
            ],
        }),
    ],
    dest: 'index.js',
}
