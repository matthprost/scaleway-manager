import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../components/components.module";
import { PipesModule } from "../../pipes/pipes.module";

import { HomePage } from "./home.page";
import { HomeRouteModule } from "./home-routing.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: HomePage,
      },
    ]),
    FontAwesomeModule,
    ComponentsModule,
    PipesModule,
    HomeRouteModule
  ],
  declarations: [HomePage],
})
export class HomePageModule {}
