import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Routes, RouterModule } from "@angular/router";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { IonicModule } from "@ionic/angular";

import { ComponentsModule } from "../../../components/components.module";
import { PipesModule } from "../../../pipes/pipes.module";

import { AddBucketPage } from "./add-bucket/add-bucket.page";
import { BucketsPage } from "./buckets.page";

const routes: Routes = [
  {
    path: "",
    component: BucketsPage,
  },
];

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        IonicModule,
        RouterModule.forChild(routes),
        ComponentsModule,
        FontAwesomeModule,
        PipesModule,
    ],
    declarations: [BucketsPage, AddBucketPage]
})
export class ObjectsPageModule {}
