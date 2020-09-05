import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Routes, RouterModule } from '@angular/router';

import { IonicModule } from '@ionic/angular';

import { ObjectsPage } from './objects.page';
import {ComponentsModule} from '../../../../components/components.module';
import {OptionsPage} from './options/options.page';
import {PipesModule} from '../../../../pipes/pipes.module';
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome';
import {ObjInfosPage} from './options/obj-infos/obj-infos.page';
import {FileTransfer, FileTransferObject} from '@ionic-native/file-transfer/ngx';
import { File } from '@ionic-native/file/ngx';

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
    ComponentsModule,
    PipesModule,
    FontAwesomeModule,
  ],
  declarations: [ObjectsPage, OptionsPage, ObjInfosPage],
  entryComponents: [OptionsPage, ObjInfosPage],
  providers: [
    FileTransferObject,
    FileTransfer,
    File
  ]
})
export class ObjectsPageModule {}
