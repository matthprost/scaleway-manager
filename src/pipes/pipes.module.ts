import { NgModule } from '@angular/core';
import { ServerIconPipe } from './server-icon/server-icon';
import { TotalVolumesSpacePipe } from './total-volumes-space/total-volumes-space';
@NgModule({
	declarations: [ServerIconPipe,
    TotalVolumesSpacePipe],
	imports: [],
	exports: [ServerIconPipe,
    TotalVolumesSpacePipe]
})
export class PipesModule {}
