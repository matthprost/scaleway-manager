// Store screenshot builds only (Expo swaps EXPO_PUBLIC_* in at bundle time; store builds set nothing): the demo
// without its badge, on a natural day, so it looks like the real app. Never ship one.
export const screenshotBuild = process.env.EXPO_PUBLIC_SCREENSHOTS === '1';
