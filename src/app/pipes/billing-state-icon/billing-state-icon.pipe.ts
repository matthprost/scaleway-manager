import { Pipe, type PipeTransform } from "@angular/core";

@Pipe({
  name: "billingStateIcon",
})
export class BillingStateIconPipe implements PipeTransform {
  transform(state: string) {
    state = state.toLowerCase();

    let icon = "help";
    const value = true;

    switch (value) {
      case state.indexOf("paid") !== -1:
        icon = "md-checkmark";
        break;
      case state.indexOf("draft") !== -1:
        icon = "md-time";
        break;
      case state.indexOf("stopped") !== -1:
        icon = "stopwatch";
        break;
      case state.indexOf("Outdated") !== -1:
        icon = "md-time";
        break;
      case state.indexOf("Incomplete") !== -1:
        icon = "close";
        break;
      case state.indexOf("Issued") !== -1:
        icon = "md-time";
        break;
      default:
        icon = "help";
    }

    return icon;
  }
}
