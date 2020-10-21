import {NgModule} from '@angular/core';
import {HideHeaderDirective} from './hide-header.directive';
import { CommonModule } from '@angular/common';

@NgModule({
  declarations: [HideHeaderDirective],
  exports: [HideHeaderDirective],
  imports: [CommonModule]
})

export class HideHeaderModule {
}
