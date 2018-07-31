import { NgModule } from '@angular/core';
import { ServerIconPipe } from './server-icon/server-icon';
import { TotalVolumesSpacePipe } from './total-volumes-space/total-volumes-space';
import { BillingStateIconPipe } from './billing-state-icon/billing-state-icon';
import {BillingStateColorPipe} from "./billing-state-color/billing-state-color";

@NgModule({
	declarations: [ServerIconPipe,
    TotalVolumesSpacePipe,
    BillingStateIconPipe,
    BillingStateColorPipe,
  ],
	imports: [],
	exports: [ServerIconPipe,
    TotalVolumesSpacePipe,
    BillingStateIconPipe,
    BillingStateColorPipe
  ]
})
export class PipesModule {}
