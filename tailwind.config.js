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
                    "info": "#3636c7",
                    "success": "#28a745",
                    "warning": "#eab308",
                    "error": "#ce2626",
                },
            },
        ]
    },
    content: ["./src/**/*.{vue,js,ts}"],
    plugins: [require("daisyui")]
}