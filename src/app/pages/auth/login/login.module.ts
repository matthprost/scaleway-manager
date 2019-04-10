import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {LoginPage} from "./login";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: LoginPage,
        outlet: 'login'
      }
    ])
  ],
  declarations: [LoginPage],
  entryComponents: [LoginPage]
})
export class LoginPageModule {}
