import { NgModule } from '@angular/core';
import {GraphComponent} from './graph/graph.component';
import {LoaderComponent} from './loader/loader.component';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ErrorComponent} from './error/error.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FontAwesomeModule
  ],
  declarations: [GraphComponent, LoaderComponent, ErrorComponent],
  exports: [
    LoaderComponent,
    GraphComponent,
    ErrorComponent,
  ]
})
export class ComponentsModule {}
