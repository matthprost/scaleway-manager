import {
  createDemoAccount,
  createDemoActivity,
  createDemoAlerts,
  createDemoApiKeys,
  createDemoAuth,
  createDemoBilling,
  createDemoDatabases,
  createDemoElasticMetal,
  createDemoFiles,
  createDemoInstances,
  createDemoJobs,
  createDemoKubernetes,
  createDemoLoadBalancers,
  createDemoServerless,
  createDemoSshKeys,
  createDemoStatus,
  createDemoWorkspace,
  createMemorySessionStore,
  DEMO_SESSION,
  demoAuthBrowser,
  demoConnectivity,
  demoLoginReceiver,
  demoScreenPrivacy,
} from '@scaleway-manager/adapters/demo';
import {
  createAuthBrowser,
  createBiometric,
  createClipboard,
  createConnectivity,
  createFiles,
  createKeyValueStore,
  createLoginReceiver,
  createPins,
  createPreferences,
  createScreenPrivacy,
  createSecureSessionStore,
  systemClock,
} from '@scaleway-manager/adapters/device';
import type { KeyValueStore } from '@scaleway-manager/adapters/device';
import {
  createScalewayAccount,
  createScalewayActivity,
  createScalewayAlerts,
  createScalewayApiKeys,
  createScalewayAuth,
  createScalewayBilling,
  createScalewayDatabases,
  createScalewayElasticMetal,
  createScalewayHttp,
  createScalewayInstances,
  createScalewayJobs,
  createScalewayKubernetes,
  createScalewayLoadBalancers,
  createScalewayServerless,
  createScalewaySshKeys,
  createScalewayStatus,
  createScalewayWorkspace,
} from '@scaleway-manager/adapters/scaleway';
import { createSessionKeeper } from '@scaleway-manager/core';
import type {
  AccountPort,
  ActivityPort,
  AlertsPort,
  ApiKeysPort,
  AuthBrowserPort,
  AuthPort,
  BiometricPort,
  ClipboardPort,
  ClockPort,
  ConnectivityPort,
  DatabasesPort,
  ElasticMetalPort,
  FilesPort,
  InstancesPort,
  InvoicesPort,
  JobsPort,
  KubernetesPort,
  LoadBalancersPort,
  LoginReceiverPort,
  PinsPort,
  Preferences,
  PreferencesPort,
  ScreenPrivacyPort,
  ServerlessPort,
  SessionKeeper,
  SessionStorePort,
  SpendingPort,
  SshKeysPort,
  StatusPort,
  WorkspacePort,
} from '@scaleway-manager/core';
import { AppState, Platform } from 'react-native';

import { screenshotBuild } from './buildConfig';

export type Mode = Preferences['mode'];

export type Services = {
  mode: Mode;
  auth: AuthPort;
  keeper: SessionKeeper;
  account: AccountPort;
  connectivity: ConnectivityPort;
  biometric: BiometricPort;
  preferences: PreferencesPort;
  clock: ClockPort;
  kv: KeyValueStore;
  receiver: LoginReceiverPort;
  browser: AuthBrowserPort;
  spending: SpendingPort;
  invoices: InvoicesPort;
  workspace: WorkspacePort;
  instances: InstancesPort;
  elasticMetal: ElasticMetalPort;
  kubernetes: KubernetesPort;
  databases: DatabasesPort;
  serverless: ServerlessPort;
  jobs: JobsPort;
  loadBalancers: LoadBalancersPort;
  pins: PinsPort;
  alerts: AlertsPort;
  status: StatusPort;
  activity: ActivityPort;
  sshKeys: SshKeysPort;
  apiKeys: ApiKeysPort;
  clipboard: ClipboardPort;
  files: FilesPort;
  // Android blanks screenshots while the Face ID lock is on
  screenPrivacy: ScreenPrivacyPort;
};

type ServiceOverrides = Partial<{
  fetch: typeof fetch;
  kv: KeyValueStore;
  biometric: BiometricPort;
  connectivity: ConnectivityPort;
  store: SessionStorePort;
  clock: ClockPort;
}>;

// The only place that picks the real (Scaleway) or demo adapters.
export const createServices = (mode: Mode, overrides: ServiceOverrides = {}): Services => {
  const kv = overrides.kv ?? createKeyValueStore();
  const device = {
    kv,
    preferences: createPreferences(kv),
    biometric: overrides.biometric ?? createBiometric(),
    clock: overrides.clock ?? systemClock,
    pins: createPins(kv),
    clipboard: createClipboard(),
  };

  if (mode === 'demo') {
    // Demo never uses fetch, and starts signed in.
    const auth = createDemoAuth();
    let clock = device.clock;
    // Store screenshot builds: the demo's day is the 18th of this month from 09:41 on (and the clock keeps
    // running), so its month-end guess and its dates look natural
    if (screenshotBuild) {
      const start = device.clock.now();
      const shift = new Date(start.getFullYear(), start.getMonth(), 18, 9, 41).getTime() - start.getTime();
      clock = { now: () => new Date(device.clock.now().getTime() + shift) };
    }
    const demoBilling = createDemoBilling(clock);

    return {
      ...device,
      clock,
      mode,
      auth,
      keeper: createSessionKeeper({ auth, store: overrides.store ?? createMemorySessionStore(DEMO_SESSION) }),
      account: createDemoAccount(),
      spending: demoBilling,
      invoices: demoBilling,
      workspace: createDemoWorkspace(),
      instances: createDemoInstances(clock),
      elasticMetal: createDemoElasticMetal(clock),
      kubernetes: createDemoKubernetes(clock),
      databases: createDemoDatabases(clock),
      serverless: createDemoServerless(clock),
      jobs: createDemoJobs(clock),
      loadBalancers: createDemoLoadBalancers(clock),
      alerts: createDemoAlerts(),
      status: createDemoStatus(clock),
      activity: createDemoActivity(clock),
      sshKeys: createDemoSshKeys(clock),
      apiKeys: createDemoApiKeys(clock),
      files: createDemoFiles(),
      screenPrivacy: demoScreenPrivacy,
      // Demo mode ignores connectivity: always online, whatever the phone says
      connectivity: demoConnectivity,
      receiver: demoLoginReceiver,
      browser: demoAuthBrowser,
    };
  }

  const fetchFn = overrides.fetch ?? fetch;
  const auth = createScalewayAuth({ fetch: fetchFn });
  // The key-value store tells the secure store whether this is the first launch after an install.
  const keeper = createSessionKeeper({ auth, store: overrides.store ?? createSecureSessionStore(kv) });
  // One shared client, so every call uses the same session renewal.
  const http = createScalewayHttp({ fetch: fetchFn, keeper });
  const billing = createScalewayBilling({ http });

  return {
    ...device,
    mode,
    auth,
    keeper,
    account: createScalewayAccount({ http, keeper }),
    spending: billing,
    invoices: billing,
    workspace: createScalewayWorkspace({ http }),
    instances: createScalewayInstances({ http }),
    elasticMetal: createScalewayElasticMetal({ http }),
    kubernetes: createScalewayKubernetes({ http }),
    databases: createScalewayDatabases({ http }),
    serverless: createScalewayServerless({ http }),
    jobs: createScalewayJobs({ http }),
    loadBalancers: createScalewayLoadBalancers({ http }),
    alerts: createScalewayAlerts({ http }),
    // The public status page takes no session.
    status: createScalewayStatus({ fetch: fetchFn }),
    activity: createScalewayActivity({ http }),
    sshKeys: createScalewaySshKeys({ http }),
    apiKeys: createScalewayApiKeys({ http, clock: device.clock }),
    files: createFiles(),
    screenPrivacy: createScreenPrivacy({ platform: Platform.OS }),
    connectivity: overrides.connectivity ?? createConnectivity(),
    receiver: createLoginReceiver(),
    browser: createAuthBrowser({ platform: Platform.OS, appState: AppState }),
  };
};
