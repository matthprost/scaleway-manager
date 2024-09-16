import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { DoubleAuthPage } from "./double-auth.page";

const routes: Routes = [
  {
    path: "",
    component: DoubleAuthPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
  ],
  declarations: [DoubleAuthPage],
})
export class DoubleAuthPageModule {}
