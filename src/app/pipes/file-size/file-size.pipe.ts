import { Pipe, type PipeTransform } from "@angular/core";

@Pipe({
  name: "fileSize",
})
export class FileSizePipe implements PipeTransform {
  private units = ["B", "kB", "MB", "GB", "TB", "PB"];

  transform(bytes = 0, precision = 2): string {
    if (isNaN(Number.parseFloat(String(bytes))) || !isFinite(bytes)) {
      return "?";
    }

    let unit = 0;

    while (bytes >= 1024) {
      bytes /= 1024;
      unit++;
    }

    return Number(bytes).toFixed(+precision) + " " + this.units[unit];
  }
}
