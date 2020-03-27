import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { ObjectsPage } from './objects.page';
import {ComponentsModule} from '../../components/components.module';
import {AddBucketPage} from './add-bucket/add-bucket.page';

const routes: Routes = [
  {
    path: '',
    component: ObjectsPage
  }
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        ComponentsModule
    ],
  declarations: [ObjectsPage, AddBucketPage],
  entryComponents: [AddBucketPage]
})
export class ObjectsPageModule {}
