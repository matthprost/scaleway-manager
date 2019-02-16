import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { AccountPage } from './account';
import {ComponentsModule} from "../../components/components.module";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";

@NgModule({
  declarations: [
    AccountPage,
  ],
  imports: [
    IonicPageModule.forChild(AccountPage),
    ComponentsModule,
    FontAwesomeModule
  ],
})
export class AccountPageModule {}
