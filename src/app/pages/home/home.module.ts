import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {IonicModule} from '@ionic/angular';
import {RouterModule} from '@angular/router';

import {HomePage} from './home.page';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ComponentsModule} from '../../components/components.module';
import {PipesModule} from '../../pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: HomePage
      }
    ]),
    FontAwesomeModule,
    ComponentsModule,
    PipesModule,
  ],
  declarations: [HomePage],
})
export class HomePageModule {
}
