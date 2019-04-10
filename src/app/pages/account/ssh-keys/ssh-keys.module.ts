import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {SshKeysPage} from "./ssh-keys";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: SshKeysPage,
        outlet: 'sshkeys'
      }
    ])
  ],
  declarations: [SshKeysPage],
  entryComponents: [SshKeysPage]
})
export class SshKeysPageModule {}
