import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2022,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            // Relaxed rules to match the existing tsconfig (strict: false)
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "no-empty": ["error", { allowEmptyCatch: true }],
            "prefer-const": "warn",
        },
    },
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "android/**",
            "ios/**",
            "electron/**",
            "references/**",
            "*.cjs",
            "*.mjs",
        ],
    }
);
