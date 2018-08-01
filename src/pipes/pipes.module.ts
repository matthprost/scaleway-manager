import { NgModule } from '@angular/core';
import { ServerIconPipe } from './server-icon/server-icon';
import { TotalVolumesSpacePipe } from './total-volumes-space/total-volumes-space';
import { BillingStateIconPipe } from './billing-state-icon/billing-state-icon';

@NgModule({
	declarations: [ServerIconPipe,
    TotalVolumesSpacePipe,
    BillingStateIconPipe,
  ],
	imports: [],
	exports: [ServerIconPipe,
    TotalVolumesSpacePipe,
    BillingStateIconPipe,
  ]
})
export class PipesModule {}
