import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'billingStateColor',
})
export class BillingStateColorPipe implements PipeTransform {

  transform(state: string) {
    state = state.toLowerCase();

    let color = 'dimgray';
    const value: boolean = true;

    switch (value) {
      case state.indexOf('paid') !== -1:
        color = 'darkgreen';
        break;
      case state.indexOf('draft') !== -1:
        color = 'darkorange';
        break;
      case state.indexOf('stopped') !== -1:
        color = 'darkorange';
        break;
      case state.indexOf('Outdated') !== -1:
        color = 'darkorange';
        break;
      case state.indexOf('Incomplete') !== -1:
        color = '';
        break;
      case state.indexOf('Issued') !== -1:
        color = 'md-time';
        break;
      default:
        color = 'dimgray';
    }

    return (color);
  }
}
