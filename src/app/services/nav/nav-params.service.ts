import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NavParamsService {

  params: {};

  constructor() {
  }

  public setParams(data) {
    this.params = data;
  }

  public getParams(): {} {
    return this.params;
  }
}
