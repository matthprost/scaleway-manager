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

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    LoginPage,
    DoubleAuthPage,
    ServerPage,
    ShowServerPage,
    ServerActionsPage,
    AccountPopoverPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    ProvidersModule,
    IonicStorageModule.forRoot(),
    PipesModule,
    DirectivesModule
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
    AccountPopoverPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    Clipboard,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
  ]
})
export class AppModule {}
