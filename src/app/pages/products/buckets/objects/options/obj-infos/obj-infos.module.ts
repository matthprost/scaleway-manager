import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Routes, RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { IonicModule } from "@ionic/angular";

import { ObjInfosPage } from "./obj-infos.page";

const routes: Routes = [
  {
    path: "",
    component: ObjInfosPage,
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
export class ObjInfosPageModule {}
