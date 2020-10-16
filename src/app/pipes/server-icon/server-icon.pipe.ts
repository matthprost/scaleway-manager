import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'serverIcon'
})
export class ServerIconPipe implements PipeTransform {

  private readonly serverOsList = [
    'ubuntu',
    'arch',
    'debian',
    'fedora',
    'alpine',
    'gitlab',
    'openvpn',
    'centos'
  ];

  transform(value: string) {
    if (value && value !== '') {
      const osName = value.toLowerCase();

      let picturePath = 'assets/img/server.svg';
      this.serverOsList.map(os => {
        if (osName.includes(os)) {
          picturePath = `assets/img/${os}.svg`;
        }
      });

      return (picturePath);
    } else {
      return 'assets/img/server.svg';
    }
  }

}
