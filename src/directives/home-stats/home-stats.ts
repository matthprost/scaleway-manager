import {Directive} from '@angular/core';
import {ServerDto} from "../../providers/servers/server.dto";

@Directive({
  selector: '[home-stats]'
})
export class HomeStatsDirective {

  constructor() {
    //
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
      default :
        value = 0;
        break;
    }
    return (value);
  }

  public whatIsTheOldest(paris: Array<ServerDto>, netherlands: Array<ServerDto>): { server: ServerDto, country: string } {
    let oldestServer: ServerDto = null;
    let country: string = null;

    paris.forEach(server => {
      if (!oldestServer) {
        oldestServer = server;
        country = 'Paris';
      } else {
        const d1 = new Date(oldestServer.creation_date);
        const d2 = new Date(server.creation_date);
        if (d2 < d1) {
          oldestServer = server;
          country = 'Paris';
        }
      }
    });

    netherlands.forEach(server => {
      if (!oldestServer) {
        oldestServer = server;
        country = 'Netherlands';
      } else {
        const d1 = new Date(oldestServer.creation_date);
        const d2 = new Date(server.creation_date);
        if (d2 < d1) {
          oldestServer = server;
          country = 'Netherlands';
        }
      }
    });

    return ({server: oldestServer, country: country});
  }

  public whatIsThePowerful(paris: Array<ServerDto>, netherlands: Array<ServerDto>): { server: ServerDto, country: string } {
    let powerfulServer: ServerDto = null;
    let country: string = null;

    paris.forEach(server => {
      if (!powerfulServer) {
        powerfulServer = server;
        country = 'Paris';
      } else {
        if (this.commercialTypeValue(server.commercial_type) > this.commercialTypeValue(powerfulServer.commercial_type)) {
          powerfulServer = server;
          country = 'Paris';
        }
      }
    });

    netherlands.forEach(server => {
      if (!powerfulServer) {
        powerfulServer = server;
        country = 'Netherlands';
      } else {
        if (this.commercialTypeValue(server.commercial_type) > this.commercialTypeValue(powerfulServer.commercial_type)) {
          powerfulServer = server;
          country = 'Netherlands';
        }
      }
    });

    return ({server: powerfulServer, country: country});
  }

}
