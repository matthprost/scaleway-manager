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

@NgModule({
  declarations: [
    MyApp,
    HomePage,
    LoginPage,
    ServerPage
  ],
  imports: [
    BrowserModule,
    IonicModule.forRoot(MyApp),
    ProvidersModule,
    IonicStorageModule.forRoot(),
  ],
  bootstrap: [IonicApp],
  entryComponents: [
    MyApp,
    HomePage,
    LoginPage,
    ServerPage
  ],
  providers: [
    StatusBar,
    SplashScreen,
    {provide: ErrorHandler, useClass: IonicErrorHandler},
  ]
})
export class AppModule {}
