import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {DoubleAuthPage} from "./double-auth";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: DoubleAuthPage,
        outlet: 'doubleauth'
      }
    ])
  ],
  declarations: [DoubleAuthPage],
  entryComponents: [DoubleAuthPage]
})
export class DoubleAuthPageModule {}
