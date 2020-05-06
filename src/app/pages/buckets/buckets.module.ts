import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { BucketsPage } from './buckets.page';
import {ComponentsModule} from '../../components/components.module';
import {AddBucketPage} from './add-bucket/add-bucket.page';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';

const routes: Routes = [
  {
    path: '',
    component: BucketsPage
  }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        ComponentsModule,
        FontAwesomeModule
    ],
  declarations: [BucketsPage, AddBucketPage],
  entryComponents: [AddBucketPage]
})
export class ObjectsPageModule {}
