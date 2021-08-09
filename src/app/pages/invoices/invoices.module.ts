import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../components/components.module";

import { InvoicesPage } from "./invoices.page";

const routes: Routes = [
  {
    path: "",
    component: InvoicesPage,
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
  declarations: [InvoicesPage],
})
export class InvoicesPageModule {}
