import commonjs from '@rollup/plugin-commonjs';
import { readFileSync } from 'fs';
// rollup.config.js (ES Module Syntax)
import resolve from '@rollup/plugin-node-resolve';
import { default as terser } from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const libraryName = 'MyMonitoringTool';

export default [
  // UMD Konfiguration
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'umd',
        name: libraryName,
        sourcemap: true,
      },
      {
        file: 'dist/index.min.js',
        format: 'umd',
        name: libraryName,
        sourcemap: true,
        plugins: [terser()]
      }
    ],
    plugins: [
      typescript({ tsconfig: './tsconfig.json', sourceMap: true, inlineSources: true }),
      resolve({ browser: true }),
      commonjs(),
    ],
    watch: {
      include: 'src/**',
    },
  }
];