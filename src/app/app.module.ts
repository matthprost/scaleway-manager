import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { IonicApp, IonicErrorHandler, IonicModule } from 'ionic-angular';

import { MyApp } from './app.component';
import { HomePage } from '../pages/home/home';

import { StatusBar } from '@ionic-native/status-bar/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import {LoginPage} from "../pages/auth/login/login";
import {ProvidersModule} from "../providers/providers.module";
import {IonicStorageModule} from "@ionic/storage";
import {ServerPage} from "../pages/server/server";
import {ShowServerPage} from "../pages/server/show-server/show-server";
import {PipesModule} from "../pipes/pipes.module";
import {Clipboard} from "@ionic-native/clipboard/ngx";
import {DoubleAuthPage} from "../pages/auth/double-auth/double-auth";
import {DirectivesModule} from "../directives/directives.module";
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import {AboutPage} from "../pages/about/about";
import {ContactPage} from "../pages/contact/contact";
import {EmailComposer} from "@ionic-native/email-composer/ngx";
import {BugReportPage} from "../pages/bug-report/bug-report";
import {InAppBrowser} from "@ionic-native/in-app-browser/ngx";
import {ComponentsModule} from "../components/components.module";
import { BillingProvider } from '../providers/billing/billing';
import {BillingPage} from "../pages/billing/billing";
import { ErrorsProvider } from '../providers/errors/errors';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {AccountPageModule} from "../pages/account/account.module";
import { AccountProvider } from '../providers/account/account';
import {AddSshKeyPage} from "../pages/account/ssh-keys/add-ssh-key/add-ssh-key";


@NgModule({
  declarations: [
    MyApp,
    HomePage,
    LoginPage,
    DoubleAuthPage,
    ServerPage,
    ShowServerPage,
    AboutPage,
    ContactPage,
    BugReportPage,
    BillingPage,
    AddSshKeyPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    ProvidersModule,
    IonicStorageModule.forRoot(),
    PipesModule,
    DirectivesModule,
    ComponentsModule,
    FontAwesomeModule,
    AccountPageModule
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    LoginPage,
    DoubleAuthPage,
    ServerPage,
    ShowServerPage,
    AboutPage,
    ContactPage,
    BugReportPage,
    BillingPage,
    AddSshKeyPage
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
    ErrorsProvider,
    AccountProvider
  ]
})
export class AppModule {}
