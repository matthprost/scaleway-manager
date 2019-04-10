import {Pipe, PipeTransform} from '@angular/core';
import {Volume} from "../../providers/servers/server.dto";

@Pipe({
  name: 'totalVolumesSpace',
})
export class TotalVolumesSpacePipe implements PipeTransform {
  transform(volumes: Array<Volume>) {
    let size = 0;
    let i: number = -1;

    while (volumes[++i]) {
      size += volumes[i].size / 1000000000;
    }

    const str: string = size + 'Go';
    return (str);
  }
}
