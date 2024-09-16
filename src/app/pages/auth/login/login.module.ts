import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { HelpPage } from "./help/help.page";
import { LoginPage } from "./login.page";

const routes: Routes = [
  {
    path: "",
    component: LoginPage,
  },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
    ],
    declarations: [LoginPage, HelpPage]
})
export class LoginPageModule {}
