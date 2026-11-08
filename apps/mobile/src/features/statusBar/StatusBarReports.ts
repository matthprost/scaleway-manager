import { createContext, useContext } from 'react';

// What screens tell the root layout, so its one status bar can follow what's under it.
export type StatusBarReports = {
  // Home's purple header is under the status bar (true), or scrolled away (false)
  setHomeHeaderUnder: (under: boolean) => void;
  // The same for Billing's purple header
  setBillingHeaderUnder: (under: boolean) => void;
  // A sheet came up; the returned function says it went
  sheetShown: () => () => void;
};

// Outside the root layout (tests, the gallery) nobody listens
export const StatusBarReportsContext = createContext<StatusBarReports>({
  setHomeHeaderUnder: () => {},
  setBillingHeaderUnder: () => {},
  sheetShown: () => () => {},
});

export function useStatusBarReports(): StatusBarReports {
  return useContext(StatusBarReportsContext);
}
