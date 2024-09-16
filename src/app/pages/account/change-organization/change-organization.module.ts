import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../../components/components.module";

import { ChangeOrganizationPage } from "./change-organization.page";

const routes: Routes = [
  {
    path: "",
    component: ChangeOrganizationPage,
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
  declarations: [],
})
export class ChangeOrganizationPageModule {}
