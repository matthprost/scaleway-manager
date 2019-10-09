import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

import { HomePage } from './home.page';
import {BillingStateIconPipe} from '../../pipes/billing-state-icon/billing-state-icon.pipe';
import {ServerIconPipe} from '../../pipes/server-icon/server-icon.pipe';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ComponentsModule} from '../../components/components.module';

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
    ComponentsModule
  ],
  declarations: [HomePage, BillingStateIconPipe, ServerIconPipe],
})
export class HomePageModule {}
