import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements OnInit {

  @Input() dataList: any;

  @Input() title: string;
  @Input() subTitle: string;

  @Input() route: string;

  @Input() hasState: boolean;
  @Input() stateVariableName: string;

  @Input() hasAvatar: boolean;
  @Input() avatarVariableName: string;

  constructor() {
  }

  ngOnInit() {
  }

  public get = (obj, path, defaultReturn = undefined) => {
    const getValue = path.split('.').reduce((acc, key) => acc && acc[key], obj);
    if (getValue === undefined) {
      return defaultReturn;
    }

    return getValue;
  };

  public setState(state): string {
    switch (state) {
      case 'stopped':
        return '#B2B6C3';
      case 'running':
        return '#30D1AD';
      case 'stopping':
        return '#3F6ED8';
      case 'starting':
        return '#3F6ED8';
      default:
        return '#B2B6C3';
    }
  }

  public setClass(state): string {
    switch (state) {
      case 'stopped':
        return 'state';
      case 'running':
        return 'state';
      case 'stopping':
        return 'blinker';
      case 'starting':
        return 'blinker';
      default:
        return 'state';
    }
  }

}
