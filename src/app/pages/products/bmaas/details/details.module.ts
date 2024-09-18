import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../../../components/components.module";
import { PipesModule } from "../../../../pipes/pipes.module";

import { DetailsPage } from "./details.page";

const routes: Routes = [
  {
    path: "",
    component: DetailsPage,
  },
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    ComponentsModule,
    PipesModule,
  ],
  declarations: [DetailsPage]
})
export class DetailsPageModule {}
