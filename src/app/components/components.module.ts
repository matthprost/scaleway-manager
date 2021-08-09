import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { IonicModule } from "@ionic/angular";

import { PipesModule } from "../pipes/pipes.module";

import { ErrorComponent } from "./error/error.component";
import { GraphComponent } from "./graph/graph.component";
import { ListComponent } from "./list/list.component";
import { LoaderComponent } from "./loader/loader.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FontAwesomeModule,
    PipesModule,
    RouterModule,
  ],
  declarations: [
    GraphComponent,
    LoaderComponent,
    ErrorComponent,
    ListComponent,
  ],
  exports: [LoaderComponent, GraphComponent, ErrorComponent, ListComponent],
})
export class ComponentsModule {}
