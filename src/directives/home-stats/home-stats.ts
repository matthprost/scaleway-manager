import {Directive} from '@angular/core';
import {ServerDto} from "../../providers/servers/server.dto";

@Directive({
  selector: '[home-stats]'
})
export class HomeStatsDirective {

  constructor() {
    //
  }

  public whatIsTheOldest(servers: Array<ServerDto>): ServerDto {
    let olderServer: ServerDto = null;

    servers.forEach(server => {
      if (!olderServer) {
        olderServer = server;
      } else {
        const d1 = new Date(olderServer.creation_date);
        const d2 = new Date(server.creation_date);
        if (d2 < d1) {
          olderServer = server;
        }
      }
    });

    return (olderServer);
  }

  private commercialTypeValue(commercialType: string) {
    let value = 0;

    switch (commercialType) {
      case 'START1-XS' :
        value = 1;
        break;
      case 'VC1S' :
        value = 2;
        break;
      case 'ARM64-2GB' :
        value = 3;
        break;
      case 'C1' :
        value = 4;
        break;
      case 'START1-S' :
        value = 5;
        break;
      case 'VC1M' :
        value = 6;
        break;
      case 'START1-M' :
        value = 7;
        break;
      case 'ARM64-4GB' :
        value = 8;
        break;
      case 'VC1L' :
        value = 9;
        break;
      case 'START1-L' :
        value = 10;
        break;
      case 'C2S' :
        value = 11;
        break;
      case 'ARM64-8GB' :
        value = 12;
        break;
      case 'C2M' :
        value = 13;
        break;
      case 'C2L' :
        value = 14;
        break;
      case 'X64-15GB' :
        value = 15;
        break;
      case 'ARM64-16GB' :
        value = 16;
        break;
      case 'X64-30GB' :
        value = 17;
        break;
      case 'ARM64-32GB' :
        value = 18;
        break;
      case 'X64-60GB' :
        value = 19;
        break;
      case 'ARM64-64GB' :
        value = 20;
        break;
      case 'X64-120GB' :
        value = 21;
        break;
      case 'ARM64-128GB' :
        value = 22;
        break;
    }
    return (value);
  }

  public whatIsThePowerfull(servers: Array<ServerDto>): ServerDto {
    let powerfulServer: ServerDto = null;

    servers.forEach(server => {
      if (!powerfulServer) {
        powerfulServer = server;
      } else {
          if (this.commercialTypeValue(server.commercial_type) > this.commercialTypeValue(powerfulServer.commercial_type)) {
            powerfulServer = server;
          }
      }
    });

    return (powerfulServer);
  }

}
