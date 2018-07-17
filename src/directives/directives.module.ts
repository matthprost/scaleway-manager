import { NgModule } from '@angular/core';
import { HomeStatsDirective } from './home-stats/home-stats';
@NgModule({
	declarations: [HomeStatsDirective],
	imports: [],
	exports: [HomeStatsDirective],
  providers: [HomeStatsDirective]
})
export class DirectivesModule {}
