import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';

import { StatusBar } from '@ionic-native/status-bar';
import { SplashScreen } from '@ionic-native/splash-screen';
import {LoginPage} from "../pages/auth/login/login";
import {ProvidersModule} from "../providers/providers.module";
import {IonicStorageModule} from "@ionic/storage";
import {ServerPage} from "../pages/server/server";
import {ShowServerPage} from "../pages/server/show-server/show-server";
import {ServerActionsPage} from "../pages/server/server-actions/server-actions";
import {PipesModule} from "../pipes/pipes.module";
import {Clipboard} from "@ionic-native/clipboard";
import {DoubleAuthPage} from "../pages/auth/double-auth/double-auth";
import {AccountPopoverPage} from "../pages/home/account-popover/account-popover";
import {DirectivesModule} from "../directives/directives.module";
import { ScreenOrientation } from '@ionic-native/screen-orientation';
import {AboutPage} from "../pages/about/about";
import {ContactPage} from "../pages/contact/contact";
import {EmailComposer} from "@ionic-native/email-composer";
import {BugReportPage} from "../pages/bug-report/bug-report";
import {InAppBrowser} from "@ionic-native/in-app-browser";
import {ComponentsModule} from "../components/components.module";
import { BillingProvider } from '../providers/billing/billing';
import {BillingPage} from "../pages/billing/billing";
import { ErrorsProvider } from '../providers/errors/errors';
import {SliderPage} from "../pages/slider/slider";

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    LoginPage,
    DoubleAuthPage,
    ServerPage,
    ShowServerPage,
    ServerActionsPage,
    AccountPopoverPage,
    AboutPage,
    ContactPage,
    BugReportPage,
    BillingPage,
    SliderPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    ProvidersModule,
    IonicStorageModule.forRoot(),
    PipesModule,
    DirectivesModule,
    ComponentsModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    LoginPage,
    DoubleAuthPage,
    ServerPage,
    ShowServerPage,
    ServerActionsPage,
    AccountPopoverPage,
    AboutPage,
    ContactPage,
    BugReportPage,
    BillingPage,
    SliderPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Clipboard,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
    ScreenOrientation,
    EmailComposer,
    InAppBrowser,
    BillingProvider,
    ErrorsProvider
  ]
})
export class AppModule {}
