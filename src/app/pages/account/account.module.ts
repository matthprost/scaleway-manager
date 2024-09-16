import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Routes, RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../components/components.module";

import { AccountPage } from "./account.page";
import { ChangeOrganizationPage } from "./change-organization/change-organization.page";
import { ChangeProjectPage } from "./change-project/change-project.page";

const routes: Routes = [
  {
    path: "",
    component: AccountPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    FontAwesomeModule,
    ComponentsModule,
  ],
  declarations: [AccountPage, ChangeOrganizationPage, ChangeProjectPage]
})
export class AccountPageModule {}
