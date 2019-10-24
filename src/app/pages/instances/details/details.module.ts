import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Routes, RouterModule} from '@angular/router';

import {IonicModule} from '@ionic/angular';

import {DetailsPage} from './details.page';
import {ComponentsModule} from '../../../components/components.module';
import {PipesModule} from '../../../pipes/pipes.module';
import {Clipboard} from '@ionic-native/clipboard/ngx';

const routes: Routes = [
  {
    path: '',
    component: DetailsPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    PipesModule,
    ComponentsModule,
  ],
  declarations: [DetailsPage],
  providers: [
    Clipboard
  ]
})
export class DetailsPageModule {
}
