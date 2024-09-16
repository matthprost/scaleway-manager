import { Pipe, type PipeTransform } from "@angular/core";

import { Volume } from "../../services/servers/server.dto";

@Pipe({
  name: "totalVolumesSpace",
})
export class TotalVolumesSpacePipe implements PipeTransform {
  transform(volumes: Volume[]): any {
    let size = 0;
    let i = -1;

    while (volumes[++i]) {
      size += volumes[i].size / 1000000000;
    }

    const str: string = size + "Go";
    return str;
  }
}
