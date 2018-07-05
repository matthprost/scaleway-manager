import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'serverIcon',
})
export class ServerIconPipe implements PipeTransform {

  transform(osName: string) {
    osName = osName.toLowerCase();

    let picturePath = '/assets/imgs/ubuntu.svg';
    const value: boolean = true;

    switch (value) {
      case osName.indexOf('ubuntu') !== -1:
        picturePath = '/assets/imgs/ubuntu.svg';
        break;
      case osName.indexOf('arch') !== -1:
        picturePath = '/assets/imgs/arch.svg';
        break;
      case osName.indexOf('debian') !== -1:
        picturePath = '/assets/imgs/debian.svg';
        break;
      case osName.indexOf('fedora') !== -1:
        picturePath = '/assets/imgs/fedora.svg';
        break;
      case osName.indexOf('alpine') !== -1:
        picturePath = '/assets/imgs/alpine.png';
        break;
      case osName.indexOf('gitlab') !== -1:
        picturePath = '/assets/imgs/gitlab.svg';
        break;
      case osName.indexOf('openvpn') !== -1:
        picturePath = '/assets/imgs/openvpn.png';
        break;
      default:
        picturePath = '/assets/imgs/server.svg';
    }

    return (picturePath);
  }
}
