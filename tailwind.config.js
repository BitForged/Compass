module.exports = {
    daisyui: {
        themes: [
            {
                'mytheme': {
                    "primary": "#67e8f9",
                    "secondary": "#78716c",
                    "accent": "#a855f7",
                    "neutral": "#44403c",
                    "base-100": "#1c1917",
                    "info": "#0000ff",
                    "success": "#00ff00",
                    "warning": "#eab308",
                    "error": "#ff0000",
                },
            },
        ]
    },
    content: ["./src/**/*.{vue,js,ts}"],
    plugins: [require("daisyui")]
}