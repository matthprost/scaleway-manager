import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {ShowServerPage} from "./show-server";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: ShowServerPage,
        outlet: 'showserver'
      }
    ])
  ],
  declarations: [ShowServerPage],
  entryComponents: [ShowServerPage]
})
export class ShowServerPageModule {}
