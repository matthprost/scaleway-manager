module.exports = {
  extends: ['@ionic/eslint-config/recommended'],
  overrides: [{
    files: '*.ts',
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',

      // Typescript 3.1 doesn't support optional chaining upgrade is needed
      '@typescript-eslint/prefer-optional-chain': 'off'
    }
  }]
}
