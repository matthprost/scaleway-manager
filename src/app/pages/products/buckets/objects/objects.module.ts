import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Routes, RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../../../components/components.module";
import { PipesModule } from "../../../../pipes/pipes.module";

import { ObjectsPage } from "./objects.page";
import { ObjInfosPage } from "./options/obj-infos/obj-infos.page";
import { OptionsPage } from "./options/options.page";

const routes: Routes = [
  {
    path: "",
    component: ObjectsPage,
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
    FontAwesomeModule,
  ],
  declarations: [ObjectsPage, OptionsPage, ObjInfosPage]
})
export class ObjectsPageModule {}
