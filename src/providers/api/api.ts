import { Injectable } from '@angular/core';
import {GetService} from "./http/get.service";
import {PostService} from "./http/post.service";
import {DeleteService} from "./http/delete.service";

@Injectable()
export class ApiProvider {

  private apiUrl: string = '/account';
  private paris1: string = '/paris';
  private amsterdam1: string = '/netherlands';

  constructor(private getService: GetService, private postService: PostService, private deleteService: DeleteService) {
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
