import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";
import { RecaptchaModule } from "ng-recaptcha";

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
    RecaptchaModule,
  ],
  declarations: [DoubleAuthPage],
})
export class DoubleAuthPageModule {}
