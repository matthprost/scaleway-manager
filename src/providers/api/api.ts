import {Injectable} from '@angular/core';
import {GetService} from "./http/get.service";
import {PostService} from "./http/post.service";
import {DeleteService} from "./http/delete.service";
import {Platform} from "ionic-angular";

@Injectable()
export class ApiProvider {

  private readonly apiUrl: string = '/account';
  private readonly billing: string = '/billing';
  private readonly paris1: string = '/paris';
  private readonly amsterdam1: string = '/netherlands';

  constructor(private platform: Platform, private getService: GetService,
              private postService: PostService, private deleteService: DeleteService) {

    if (this.platform.is('cordova') == true) {
      this.apiUrl = 'https://account.scaleway.com';
      this.billing = 'https://billing.scaleway.com';
      this.paris1 = 'https://cp-par1.scaleway.com';
      this.amsterdam1 = 'https://cp-ams1.scaleway.com';
    }
  }

  public getApiUrl() {
    return (this.apiUrl);
  }

  public getParisApiUrl() {
    return (this.paris1);
  }

  public getAmsterdamApiUrl() {
    return (this.amsterdam1);
  }

  public getBillingApiUrl() {
    return (this.billing);
  }

  public get<T>(url: string, token?: string): Promise<T> {
    return (this.getService.submit(url, token));
  }

  public post<T>(url: string, token?: string, body?: object): Promise<T> {
    return (this.postService.submit(url, token, body));
  }

  public delete<T>(url: string, token?: string): Promise<T> {
    return (this.deleteService.submit(url, token));
  }

}
