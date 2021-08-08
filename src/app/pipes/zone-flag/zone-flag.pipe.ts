import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "zoneFlag",
})
export class ZoneFlagPipe implements PipeTransform {
  transform(value: string): any {
    let picturePath: string;
    switch (true) {
      case value.includes("fr-par"):
        picturePath = "assets/img/france.svg";
        break;
      case value.includes("nl-ams"):
        picturePath = "assets/img/netherlands.svg";
        break;
      case value.includes("pl-waw"):
        picturePath = "assets/img/warsaw.svg";
        break;
      default:
        picturePath = "assets/img/all.svg";
        break;
    }

    return picturePath;
  }
}
