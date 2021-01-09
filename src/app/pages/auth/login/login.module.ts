import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { LoginPage } from './login.page';
import {HelpPage} from './help/help.page';
import {RecaptchaModule} from 'ng-recaptcha';

const routes: Routes = [
  {
    path: '',
    component: LoginPage
  }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        RecaptchaModule
    ],
  declarations: [LoginPage, HelpPage],
  entryComponents: [HelpPage]
})
export class LoginPageModule {}
