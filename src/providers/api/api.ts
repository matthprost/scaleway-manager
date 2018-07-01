import { Injectable } from '@angular/core';
import {GetService} from "./http/get-service";
import {PostService} from "./http/post-service";

@Injectable()
export class ApiProvider {

  private apiUrl: string = 'https://account.scaleway.com';

  constructor(private getService: GetService, private postService: PostService) {
  }

  public getApiUrl() {
    return (this.apiUrl);
  }

  public get<T>(url: string, token?: string, body?: object): Promise<T> {
    return (this.getService.submit(url, token, body));
  }

  public post<T>(url: string, token?: string, body?: object): Promise<T> {
    return (this.postService.submit(url, token, body));
  }

}
