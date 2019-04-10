import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {AddSshKeyPage} from "./add-ssh-key";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: AddSshKeyPage,
        outlet: 'addsshkey'
      }
    ])
  ],
  declarations: [AddSshKeyPage],
  entryComponents: [AddSshKeyPage]
})
export class AddSshKeyPageModule {}
