import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {AccountPage} from './account';
import {ComponentsModule} from "../../components/components.module";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SshKeysPage} from "./ssh-keys/ssh-keys";

@NgModule({
  declarations: [
    AccountPage,
    SshKeysPage,
  ],
  imports: [
    IonicPageModule.forChild(AccountPage),
    ComponentsModule,
    FontAwesomeModule,
  ],
  entryComponents: [
    SshKeysPage,
  ]
})
export class AccountPageModule {
}
