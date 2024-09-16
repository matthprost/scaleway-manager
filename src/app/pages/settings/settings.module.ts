import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Routes, RouterModule } from "@angular/router";
import { IonicModule } from "@ionic/angular";

import { SettingsPage } from "./settings.page";
import { SettingsPageRouteModule } from "./settings-routing.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SettingsPageRouteModule
  ],
  declarations: [SettingsPage],
})
export class SettingsPageModule {}
