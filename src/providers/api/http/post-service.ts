import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";

@Injectable()
export class PostService {

  constructor(private http: HttpClient) {
  }

  public submit<T>(url: string, token?: string, body?: object): Promise<T> {

    let headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    if (token) {
      headers.append('X-Auth-Token', token);
    }

    return new Promise((resolve, reject) => {
      this.http.post<T>(url, body, { headers: headers }).subscribe(
        data => {
          resolve(data);
        },
        result => {
          reject(result);
        });
    })
  }

}
