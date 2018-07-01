import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from "@angular/common/http";

@Injectable()
export class GetService {

  constructor(private http: HttpClient) {
  }

  public submit<T>(url: string, token?: string): Promise<T> {

    let headers = new HttpHeaders();
    headers.append('Content-Type', 'application/json');
    if (token) {
      headers.append('X-Auth-Token', token);
    }

    return new Promise((resolve, reject) => {
      this.http.get<T>(url, { headers: headers }).subscribe(
        data => {
          resolve(data);
        },
        result => {
          reject(result);
        });
    })
  }

}
