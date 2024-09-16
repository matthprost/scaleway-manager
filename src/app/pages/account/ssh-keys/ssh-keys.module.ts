import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../../components/components.module";

import { AddSshKeyPage } from "./add-ssh-key/add-ssh-key.page";
import { SshKeysPage } from "./ssh-keys.page";

const routes: Routes = [
  {
    path: "",
    component: SshKeysPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ComponentsModule,
  ],
  declarations: [SshKeysPage, AddSshKeyPage]
})
export class SshKeysPageModule {}
