import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {App} from "ionic-angular";

@Injectable()
export class GetService {

  constructor(private http: HttpClient, private app: App) {
  }

  public submit<T>(url: string, token?: string): Promise<T> {


    return new Promise((resolve, reject) => {
      this.http.get<T>(url, {
        headers: token ?
          {
            'x-auth-token': token
          } : {}
      }).subscribe(
        data => {
          resolve(data);
        },
        error => {
          console.log(error);
          reject(error);
        });
    })
  }

}
