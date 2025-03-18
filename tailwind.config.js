module.exports = {
    theme: {
        extend: {
            screens: {
                '3xl': '1920px',
            }
        },
    },
    daisyui: {
        themes: [
            {
                'mytheme': {
                    "primary": "#2563eb",
                    "secondary": "#f59e0b",
                    "accent": "#a78bfa",
                    "neutral": "#5e6065",
                    "base-100": "#121217",
                    "base-200": "#171615",
                    "info": "#38bdf8",
                    "success": "#4ade80",
                    "warning": "#facc15",
                    "error": "#f87171",
                },
            },
        ]
    },
    content: ["./src/**/*.{vue,js,ts}"],
    plugins: [require("daisyui")]
}