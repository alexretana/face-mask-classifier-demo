/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
	plugins: [require('daisyui')],
	daisyui: {
		theme: [
			{
				business: require('daisyui/src/colors/themes')['[data-theme=business]'],
			},
		],
		darkTheme: 'business',
	}
}