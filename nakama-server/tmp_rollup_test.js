export default {
  input: 'data/modules/main.ts',
  output: {
    file: 'data/modules/build/test.js',
    format: 'cjs'
  },
  plugins: [
    require('@rollup/plugin-node-resolve').default(),
    require('@rollup/plugin-commonjs')(),
    require('@rollup/plugin-typescript')()
  ]
};
