import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";

@Injectable()
export class DeleteService {

  constructor(private http: HttpClient) {
  }

  public submit<T>(url: string, token?: string): Promise<T> {

    return new Promise((resolve, reject) => {
      this.http.delete<T>(url,
        {
          headers: token ?
            {
              'X-Session-Token': token
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
