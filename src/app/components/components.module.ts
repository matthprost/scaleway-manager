import { NgModule } from '@angular/core';
import {GraphComponent} from './graph/graph.component';
import {LoaderComponent} from './loader/loader.component';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FontAwesomeModule
  ],
  declarations: [GraphComponent, LoaderComponent],
  exports: [
    LoaderComponent,
    GraphComponent
  ]
})
export class ComponentsModule {}
