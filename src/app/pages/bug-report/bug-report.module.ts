import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {BugReportPage} from "./bug-report";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: '',
        component: BugReportPage,
        outlet: 'bugreport'
      }
    ])
  ],
  declarations: [BugReportPage],
  entryComponents: [BugReportPage]
})
export class BugReportPageModule {}
