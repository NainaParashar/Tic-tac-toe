import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'data/modules/main.ts',
  output: {
    file: 'data/modules/build/index.js',
    format: 'cjs',
    intro: 'var module = { exports: {} }; var exports = module.exports;'
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json'
    })
  ]
};
