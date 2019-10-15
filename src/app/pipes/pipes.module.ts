import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ServerIconPipe} from './server-icon/server-icon.pipe';
import {BillingStateIconPipe} from './billing-state-icon/billing-state-icon.pipe';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FontAwesomeModule
  ],
  declarations: [ServerIconPipe, BillingStateIconPipe],
  exports: [
    ServerIconPipe,
    BillingStateIconPipe
  ]
})
export class PipesModule {}
