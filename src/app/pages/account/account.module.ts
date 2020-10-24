import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { AccountPage } from './account.page';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ComponentsModule} from '../../components/components.module';
import {ChangeOrganizationPage} from './change-organization/change-organization.page';
import {ChangeProjectPage} from './change-project/change-project.page';

const routes: Routes = [
  {
    path: '',
    component: AccountPage
  }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild(routes),
    FontAwesomeModule,
    ComponentsModule
  ],
  declarations: [AccountPage, ChangeOrganizationPage, ChangeProjectPage],
  entryComponents: [ChangeOrganizationPage, ChangeProjectPage]
})
export class AccountPageModule {}
