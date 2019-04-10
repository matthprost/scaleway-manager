import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {BillingPage} from "./billing";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: BillingPage,
        outlet: 'billing'
      }
    ])
  ],
  declarations: [BillingPage],
  entryComponents: [BillingPage]
})
export class BillingPageModule {}
