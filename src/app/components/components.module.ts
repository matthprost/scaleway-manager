import { NgModule } from '@angular/core';
import {GraphComponent} from './graph/graph.component';
import {LoaderComponent} from './loader/loader.component';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ErrorComponent} from './error/error.component';
import {ListComponent} from './list/list.component';
import {PipesModule} from '../pipes/pipes.module';
import {RouterModule} from '@angular/router';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FontAwesomeModule,
    PipesModule,
    RouterModule
  ],
  declarations: [GraphComponent, LoaderComponent, ErrorComponent, ListComponent],
  exports: [
    LoaderComponent,
    GraphComponent,
    ErrorComponent,
    ListComponent
  ]
})
export class ComponentsModule {}
