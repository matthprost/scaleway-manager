import * as WebBrowser from 'expo-web-browser';

// The app's source code, in the phone's browser. Rejects when it can't open: the caller says so.
export const openRepository = () => WebBrowser.openBrowserAsync('https://github.com/matthprost/scaleway-manager');
