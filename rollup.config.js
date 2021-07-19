const terser = require('rollup-plugin-terser').terser;
const pkg = require('./package.json');

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.homepage}
 * (c) ${new Date().getFullYear()} Chart.js Contributors
 * Released under the ${pkg.license} license
 */`;
 
 const external = [
  'chart.js',
  'chart.js/helpers'
];
const globals = {
  'chart.js': 'Chart',
  'chart.js/helpers': 'Chart.helpers'
}

module.exports = [

	{
		input: 'src/index.js',
		output: {
			name: 'ChartCrosshair',
			file: `dist/${pkg.name}.js`,
			banner: banner,
			format: 'umd',
			indent: false,
			globals: globals
		},
		external: external
	},

	{
		input: 'src/index.js',
		output: {
			name: 'ChartCrosshair',
			file: `dist/${pkg.name}.min.js`,
			format: 'umd',
			indent: false,
			globals: globals,
			},
			plugins: [
				terser({
					output: {
						preamble: banner
					}
				})
			],
			external: external
	},
	{
    input: 'src/index.esm.js',
    output: {
      name: 'ChartCrosshair',
      file: `dist/${pkg.name}.esm.js`,
      format: 'esm',
      indent: false
    },
    external: external
  },
];
