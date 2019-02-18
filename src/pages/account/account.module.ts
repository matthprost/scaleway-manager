import {NgModule} from '@angular/core';
import {IonicPageModule} from 'ionic-angular';
import {AccountPage} from './account';
import {ComponentsModule} from "../../components/components.module";
import {FontAwesomeModule} from "@fortawesome/angular-fontawesome";
import {SshKeysPage} from "./ssh-keys/ssh-keys";
import {TokensPage} from "./tokens/tokens";

@NgModule({
  declarations: [
    AccountPage,
    SshKeysPage,
    TokensPage
  ],
  imports: [
    IonicPageModule.forChild(AccountPage),
    ComponentsModule,
    FontAwesomeModule,
  ],
  entryComponents: [
    SshKeysPage,
    TokensPage
  ]
})
export class AccountPageModule {
}
