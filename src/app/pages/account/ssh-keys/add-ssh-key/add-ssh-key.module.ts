import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { AddSshKeyPage } from "./add-ssh-key.page";

const routes: Routes = [
  {
    path: "",
    component: AddSshKeyPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
  ],
})
export class AddSshKeyPageModule {}
