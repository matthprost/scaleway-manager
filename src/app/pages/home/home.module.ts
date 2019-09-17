import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { HomePage } from './home.page';
import {BillingStateIconPipe} from '../../pipes/billing-state-icon/billing-state-icon.pipe';
import {ServerIconPipe} from '../../pipes/server-icon/server-icon.pipe';
import {HomeStatsDirective} from '../../directives/home-stats/home-stats.directive';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';

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
    FontAwesomeModule
  ],
  declarations: [HomePage, BillingStateIconPipe, ServerIconPipe, HomeStatsDirective],
  providers: [
    HomeStatsDirective
  ]
})
export class HomePageModule {}
