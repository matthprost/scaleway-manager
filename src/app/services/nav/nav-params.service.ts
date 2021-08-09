import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class NavParamsService {
  params: any;

  constructor() {}

  public setParams(data) {
    this.params = data;
  }

  public getParams(): any {
    return this.params;
  }
}
